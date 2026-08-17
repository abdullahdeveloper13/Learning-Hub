import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();
const aiLimiter = (feature: string) => rateLimit({ keyPrefix: `ai-${feature}`, windowMs: 60_000, max: 20 });

type JsonObject = Record<string, unknown>;

type AIRequest = {
  feature: string;
  system: string;
  user: string;
};

interface AIProvider {
  readonly name: string;
  generateJson(request: AIRequest): Promise<JsonObject>;
}

type ProviderConfig = {
  name: string;
  displayName: string;
  baseUrl: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  setupUrl: string;
};

const PROVIDERS: readonly ProviderConfig[] = [
  {
    name: "gemini",
    displayName: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    setupUrl: "https://aistudio.google.com/apikey",
  },
  {
    name: "groq",
    displayName: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    setupUrl: "https://console.groq.com/keys",
  },
  {
    name: "openrouter",
    displayName: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openrouter/free",
    setupUrl: "https://openrouter.ai/keys",
  },
  {
    name: "mistral",
    displayName: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    modelEnv: "MISTRAL_MODEL",
    defaultModel: "mistral-small-latest",
    setupUrl: "https://console.mistral.ai/api-keys",
  },
  {
    name: "openai",
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-5-mini",
    setupUrl: "https://platform.openai.com/api-keys",
  },
] as const;

class MissingAIProvider implements AIProvider {
  readonly name = "not-configured";

  async generateJson(): Promise<JsonObject> {
    throw new AIProviderConfigurationError();
  }
}

class ChatCompletionsProvider implements AIProvider {
  readonly name: string;
  private readonly config: ProviderConfig;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.name = config.name;
    this.apiKey = process.env[config.apiKeyEnv]?.trim() ?? "";
    this.model = process.env[config.modelEnv]?.trim() || config.defaultModel;
  }

  async generateJson(request: AIRequest) {
    if (!this.apiKey) throw new AIProviderConfigurationError();

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `${request.system}\nReturn only valid JSON. Do not wrap the JSON in markdown code fences.`,
          },
          { role: "user", content: request.user },
        ],
        max_tokens: 4096,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new AIProviderRequestError(
        `${this.config.displayName} request failed: ${detail || response.statusText}`,
        response.status,
        this.config.displayName,
      );
    }

    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new AIProviderRequestError(`${this.config.displayName} response did not include text output`, 502, this.config.displayName);

    try {
      return extractJson(text);
    } catch {
      throw new AIProviderRequestError(`${this.config.displayName} response was not valid JSON`, 502, this.config.displayName);
    }
  }
}

class AIProviderConfigurationError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AIProviderConfigurationError";
  }
}

class AIProviderRequestError extends Error {
  readonly safeMessage: string;

  constructor(message: string, readonly status = 502, readonly provider = "AI provider") {
    super(message);
    this.name = "AIProviderRequestError";
    this.safeMessage = safeAIProviderMessage(status, provider);
  }
}

const courseOutlineInput = z.object({
  topic: z.string().min(2).max(120),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  targetAudience: z.string().min(2).max(160).default("motivated learners"),
});

const courseOutlineOutput = z.object({
  title: z.string().catch("Course outline"),
  description: z.string().catch(""),
  modules: z.array(z.object({
    title: z.string().catch("Module"),
    description: z.string().catch(""),
    lessons: z.array(z.string()).catch([]),
  })).catch([]),
});

const quizInput = z.object({
  topic: z.string().min(2).max(120),
  questionCount: z.coerce.number().int().min(1).max(10).default(5),
});

const quizOutput = z.object({
  title: z.string().catch("Practice Quiz"),
  questions: z.array(z.object({
    text: z.string().catch("Question"),
    type: z.enum(["multiple_choice", "true_false", "fill_blank"]).catch("multiple_choice"),
    options: z.array(z.string()).catch([]),
    correctAnswer: z.string().catch(""),
    explanation: z.string().catch(""),
  })).catch([]),
});

const flashcardsInput = z.object({
  topic: z.string().min(2).max(120),
  count: z.coerce.number().int().min(1).max(20).default(10),
});

const flashcardsOutput = z.object({
  flashcards: z.array(z.object({
    front: z.string().catch(""),
    back: z.string().catch(""),
  })).catch([]),
});

const summaryInput = z.object({
  content: z.string().min(30).max(20_000),
});

const summaryOutput = z.object({
  summary: z.string().catch(""),
  keyPoints: z.array(z.string()).catch([]),
});

const studyPlanInput = z.object({
  goal: z.string().min(2).max(240).default("Complete the course successfully"),
  availableHoursPerWeek: z.coerce.number().min(1).max(40).default(5),
  durationWeeks: z.coerce.number().int().min(1).max(12).default(4),
});

const studyPlanOutput = z.object({
  weeks: z.array(z.object({
    week: z.coerce.number().catch(1),
    tasks: z.array(z.object({
      day: z.string().catch("Day"),
      title: z.string().catch("Task"),
      estimatedMinutes: z.coerce.number().catch(60),
      lessonId: z.number().nullable().catch(null),
    })).catch([]),
  })).catch([]),
});

const chatInput = z.object({
  message: z.string().min(1).max(4000),
  courseId: z.number().optional(),
});

const chatOutput = z.object({
  message: z.string().catch(""),
});

function getProvider(): AIProvider {
  const explicit = process.env["AI_PROVIDER"]?.trim().toLowerCase();
  if (explicit) {
    const match = PROVIDERS.find((provider) => provider.name === explicit);
    if (match && process.env[match.apiKeyEnv]?.trim()) return new ChatCompletionsProvider(match);
  }
  for (const config of PROVIDERS) {
    if (process.env[config.apiKeyEnv]?.trim()) return new ChatCompletionsProvider(config);
  }
  return new MissingAIProvider();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function answerToString(value: unknown): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : "";
  }
  return stringValue(value) ?? "";
}

function normalizeQuestionType(raw: string): "multiple_choice" | "true_false" | "fill_blank" {
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (/true|false|boolean/i.test(normalized)) return "true_false";
  if (/fill|blank|short|complete/i.test(normalized)) return "fill_blank";
  return "multiple_choice";
}

function collectPoints(values: unknown[]): string[] {
  const points: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      points.push(value.trim());
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = stringValue(item) ?? (item && typeof item === "object"
          ? stringValue((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).title ?? (item as Record<string, unknown>).description ?? (item as Record<string, unknown>).text)
          : null);
        if (text) points.push(text);
      }
    }
  }
  return points;
}

function normalizeOutline(raw: JsonObject): JsonObject {
  const title = stringValue(raw.title ?? raw.course_title ?? raw.name) ?? "Course outline";
  const description = stringValue(raw.description ?? raw.course_description ?? raw.overview) ?? "";
  const rawModules = asArray(raw.modules ?? raw.sections ?? raw.course_outline ?? raw.units);
  const modules = rawModules
    .map((module) => {
      const obj = module && typeof module === "object" ? module as Record<string, unknown> : { title: stringValue(module) };
      const moduleTitle = stringValue(obj.title ?? obj.module_title ?? obj.name) ?? "";
      const moduleDescription = stringValue(obj.description ?? obj.module_description ?? obj.overview) ?? "";
      const lessons = asArray(obj.lessons ?? obj.lectures ?? obj.items ?? obj.topics)
        .map((lesson) => {
          if (typeof lesson === "string") return lesson.trim();
          if (lesson && typeof lesson === "object") {
            return stringValue((lesson as Record<string, unknown>).lesson_title ?? (lesson as Record<string, unknown>).title ?? (lesson as Record<string, unknown>).name) ?? "";
          }
          return "";
        })
        .filter(Boolean);
      return { title: moduleTitle, description: moduleDescription, lessons };
    })
    .filter((module) => module.title && module.lessons.length > 0);
  return { title, description, modules };
}

function normalizeQuiz(raw: JsonObject): JsonObject {
  const questions = asArray(raw.questions ?? raw.items)
    .map((question) => {
      const obj = question && typeof question === "object" ? question as Record<string, unknown> : {};
      const text = stringValue(obj.text ?? obj.question ?? obj.prompt) ?? "";
      const type = normalizeQuestionType(stringValue(obj.type ?? obj.questionType) ?? "multiple_choice");
      const options = asArray(obj.options ?? obj.choices).map((option) => stringValue(option) ?? "").filter(Boolean);
      const correctAnswer = answerToString(obj.correctAnswer ?? obj.answer ?? obj.correct);
      const explanation = stringValue(obj.explanation ?? obj.rationale) ?? "";
      const finalOptions = type === "true_false" && options.length === 0 ? ["True", "False"] : options;
      return { text, type, options: finalOptions, correctAnswer, explanation };
    })
    .filter((question) => question.text.length > 0);
  return { title: stringValue(raw.title) ?? "Practice Quiz", questions };
}

function normalizeFlashcards(raw: JsonObject): JsonObject {
  const flashcards = asArray(raw.flashcards ?? raw.cards)
    .map((card) => {
      if (typeof card === "string") return { front: card, back: "" };
      const obj = card && typeof card === "object" ? card as Record<string, unknown> : {};
      return {
        front: stringValue(obj.front ?? obj.question ?? obj.term) ?? "",
        back: stringValue(obj.back ?? obj.answer ?? obj.definition) ?? "",
      };
    })
    .filter((card) => card.front.length > 0);
  return { flashcards };
}

function normalizeSummary(raw: JsonObject): JsonObject {
  let summaryText = "";
  let keyPoints: string[] = [];
  const summaryField = raw.summary;

  if (typeof summaryField === "string") {
    summaryText = summaryField.trim();
  } else if (summaryField && typeof summaryField === "object") {
    const summaryObj = summaryField as Record<string, unknown>;
    summaryText = stringValue(summaryObj.summary ?? summaryObj.content ?? summaryObj.description ?? summaryObj.text ?? summaryObj.title) ?? "";
    keyPoints = collectPoints([
      summaryObj.keyPoints,
      summaryObj.key_points,
      summaryObj.points,
      summaryObj.takeaways,
      summaryObj.action_items,
      summaryObj.key_concepts,
    ]);
  }

  if (!summaryText) {
    summaryText = stringValue(raw.summary_text ?? raw.content ?? raw.description ?? raw.text) ?? "";
  }
  if (keyPoints.length === 0) {
    keyPoints = collectPoints([
      raw.keyPoints,
      raw.key_points,
      raw.points,
      raw.takeaways,
      raw.action_items,
      raw.key_concepts,
    ]);
  }
  return { summary: summaryText, keyPoints };
}

function normalizeStudyPlan(raw: JsonObject): JsonObject {
  const weeks = asArray(raw.weeks ?? raw.plan ?? raw.schedule)
    .map((week, index) => {
      const obj = week && typeof week === "object" ? week as Record<string, unknown> : {};
      const tasks = asArray(obj.tasks ?? obj.items ?? obj.activities)
        .map((task) => {
          const taskObj = task && typeof task === "object" ? task as Record<string, unknown> : {};
          return {
            day: stringValue(taskObj.day ?? taskObj.day_of_week) ?? "",
            title: stringValue(taskObj.title ?? taskObj.name ?? taskObj.task) ?? "",
            estimatedMinutes: typeof taskObj.estimatedMinutes === "number" ? taskObj.estimatedMinutes
              : typeof taskObj.minutes === "number" ? taskObj.minutes
              : typeof taskObj.duration === "number" ? taskObj.duration
              : 60,
            lessonId: typeof taskObj.lessonId === "number" ? taskObj.lessonId
              : typeof taskObj.lesson_id === "number" ? taskObj.lesson_id
              : null,
          };
        })
        .filter((task) => task.title.length > 0);
      const weekNumber = typeof obj.week === "number" ? obj.week : index + 1;
      return { week: weekNumber, tasks };
    })
    .filter((week) => week.tasks.length > 0);
  return { weeks };
}

function normalizeChat(raw: JsonObject): JsonObject {
  return { message: stringValue(raw.message ?? raw.response ?? raw.text ?? raw.answer) ?? "" };
}

async function runAI<T extends z.ZodTypeAny>(
  feature: string,
  outputSchema: T,
  system: string,
  user: string,
  example?: string,
  normalize?: (raw: JsonObject) => JsonObject,
) {
  const provider = getProvider();
  try {
    const raw = await provider.generateJson({
      feature,
      system: example ? `${system}\nReturn your answer as valid JSON. Prefer this shape: ${example}` : system,
      user,
    });
    return outputSchema.parse(normalize ? normalize(raw) : raw);
  } catch (error) {
    if (!example || error instanceof AIProviderConfigurationError) throw error;
    const raw = await provider.generateJson({
      feature,
      system: `${system}\nReturn ONLY valid JSON that matches EXACTLY this shape (no markdown fences, no prose, no extra fields):\n${example}`,
      user,
    });
    return outputSchema.parse(normalize ? normalize(raw) : raw);
  }
}

router.post("/ai/generate-course-outline", requireAuth, aiLimiter("course-outline"), async (req, res) => {
  const parsed = courseOutlineInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI course outline request", issues: parsed.error.issues }); return; }
  const { topic, level, targetAudience } = parsed.data;

  try {
    const result = await runAI(
      "course-outline",
      courseOutlineOutput,
      "You are an expert LMS instructional designer creating practical, production-ready course outlines.",
      `Create a ${level} course outline about "${topic}" for ${targetAudience}. Include 5 to 6 modules with clear lesson titles.`,
      `{"title":"Course Title","description":"Short course description","modules":[{"title":"Module 1","description":"What learners cover","lessons":["Lesson 1","Lesson 2","Lesson 3"]}]}`,
      normalizeOutline,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "course-outline");
  }
});

router.post("/ai/generate-quiz", requireAuth, aiLimiter("quiz"), async (req, res) => {
  const parsed = quizInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI quiz request", issues: parsed.error.issues }); return; }
  const { topic, questionCount } = parsed.data;

  try {
    const result = await runAI(
      "quiz-generator",
      quizOutput,
      "You create LMS assessment questions with clear answer keys and concise explanations.",
      `Generate ${questionCount} assessment questions about "${topic}". Use a mix of multiple_choice, true_false, and fill_blank when appropriate.`,
      `{"title":"Quiz Title","questions":[{"text":"Question text","type":"multiple_choice","options":["Option A","Option B","Option C"],"correctAnswer":"Option A","explanation":"Why this is correct"}]}`,
      normalizeQuiz,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "quiz-generator");
  }
});

router.post("/ai/generate-flashcards", requireAuth, aiLimiter("flashcards"), async (req, res) => {
  const parsed = flashcardsInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI flashcards request", issues: parsed.error.issues }); return; }
  const { topic, count } = parsed.data;

  try {
    const result = await runAI(
      "flashcards",
      flashcardsOutput,
      "You create concise study flashcards for LMS learners.",
      `Create ${count} flashcards about "${topic}". Keep fronts short and backs useful for recall.`,
      `{"flashcards":[{"front":"Question or concept","back":"Answer or definition"}]}`,
      normalizeFlashcards,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "flashcards");
  }
});

router.post("/ai/summarize-lesson", requireAuth, aiLimiter("summary"), async (req, res) => {
  const parsed = summaryInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI summary request", issues: parsed.error.issues }); return; }

  try {
    const result = await runAI(
      "lesson-summary",
      summaryOutput,
      "You summarize LMS lessons for students. Preserve important concepts and action items.",
      `Summarize this lesson content and extract key points:\n\n${parsed.data.content}`,
      `{"summary":"Concise summary of the content","keyPoints":["Key point 1","Key point 2","Key point 3"]}`,
      normalizeSummary,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "lesson-summary");
  }
});

router.post("/ai/study-plan", requireAuth, aiLimiter("study-plan"), async (req, res) => {
  const parsed = studyPlanInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI study plan request", issues: parsed.error.issues }); return; }
  const { goal, availableHoursPerWeek, durationWeeks } = parsed.data;

  try {
    const result = await runAI(
      "study-plan",
      studyPlanOutput,
      "You create realistic LMS study plans with weekly tasks and reasonable time estimates.",
      `Create a ${durationWeeks}-week study plan for this goal: "${goal}". The learner has ${availableHoursPerWeek} hours per week.`,
      `{"weeks":[{"week":1,"tasks":[{"day":"Monday","title":"Task title","estimatedMinutes":60,"lessonId":null}]}]}`,
      normalizeStudyPlan,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "study-plan");
  }
});

router.post("/ai/chat", requireAuth, aiLimiter("chat"), async (req, res) => {
  const parsed = chatInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI chat request", issues: parsed.error.issues }); return; }

  try {
    const result = await runAI(
      "learning-assistant",
      chatOutput,
      "You are SkillForge AI's learning assistant. Give clear, supportive, course-safe tutoring guidance without pretending to access unavailable private data.",
      parsed.data.message,
      `{"message":"Your helpful reply"}`,
      normalizeChat,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "learning-assistant");
  }
});

function handleAIError(req: Request, res: Response, error: unknown, feature: string) {
  if (error instanceof AIProviderConfigurationError) {
    res.status(503).json({
      error: "AI provider is not configured",
      code: "AI_PROVIDER_NOT_CONFIGURED",
      feature,
      requiredEnv: PROVIDERS.map((provider) => provider.apiKeyEnv),
      providers: PROVIDERS.map((provider) => ({ name: provider.name, setupUrl: provider.setupUrl })),
    });
    return;
  }

  req.log.error({ err: error, feature }, "AI provider request failed");
  if (error instanceof AIProviderRequestError) {
    res.status(error.status).json({
      error: error.safeMessage,
      code: "AI_PROVIDER_REQUEST_FAILED",
      feature,
    });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(502).json({ error: "AI provider returned an unexpected response shape", feature });
    return;
  }
  if (error instanceof Error) {
    req.log.error({ err: error, feature }, "Unexpected AI provider failure");
    res.status(502).json({
      error: safeUnexpectedAIMessage(error),
      code: "AI_PROVIDER_UNAVAILABLE",
      feature,
    });
    return;
  }
  res.status(502).json({ error: "AI provider is unavailable. Please try again later.", feature });
}

function safeAIProviderMessage(status: number, provider: string) {
  if (status === 401) return `${provider} rejected the API key. Check the provider key on the server.`;
  if (status === 403) return `${provider} rejected this request. Check project permissions and model access.`;
  if (status === 404) return `The configured ${provider} model was not found. Check the model name on the server.`;
  if (status === 429) return `${provider} rate-limited the request or the project has no available quota. Wait a minute and try again.`;
  if (status >= 500) return `${provider} is temporarily unavailable. Please try again soon.`;
  return "AI provider request failed. Check the server logs for provider details.";
}

function safeUnexpectedAIMessage(error: Error) {
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|network/i.test(error.message)) {
    return "The API server could not reach the AI provider. Check network access and the provider key.";
  }
  if (/aborted|timeout/i.test(error.message)) {
    return "The AI request timed out. Please try again.";
  }
  return "AI provider is unavailable. Check the API server logs for details.";
}

function extractJson(text: string): JsonObject {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as JsonObject;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as JsonObject;
      } catch {
        // fall through to throw
      }
    }
    throw new Error("AI provider returned non-JSON output");
  }
}

export default router;
