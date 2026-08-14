import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();
const aiLimiter = rateLimit({ keyPrefix: "ai", windowMs: 60_000, max: 20 });

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

class MissingAIProvider implements AIProvider {
  readonly name = "not-configured";

  async generateJson(): Promise<JsonObject> {
    throw new AIProviderConfigurationError();
  }
}

class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly apiKey = process.env["OPENAI_API_KEY"];
  private readonly model = process.env["OPENAI_MODEL"] || "gpt-5-mini";

  async generateJson(request: AIRequest) {
    if (!this.apiKey) throw new AIProviderConfigurationError();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "system",
            content: `${request.system}\nReturn only valid JSON. Do not wrap the JSON in markdown.`,
          },
          { role: "user", content: request.user },
        ],
        max_output_tokens: 1800,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new AIProviderRequestError(`OpenAI request failed: ${detail || response.statusText}`, response.status);
    }

    const payload = await response.json() as { output_text?: string; output?: unknown[] };
    const text = payload.output_text ?? extractResponsesText(payload.output);
    if (!text) throw new AIProviderRequestError("OpenAI response did not include text output", 502);

    try {
      return JSON.parse(text) as JsonObject;
    } catch {
      throw new AIProviderRequestError("OpenAI response was not valid JSON", 502);
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
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "AIProviderRequestError";
  }
}

const courseOutlineInput = z.object({
  topic: z.string().min(2).max(120),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  targetAudience: z.string().min(2).max(160).default("motivated learners"),
});

const courseOutlineOutput = z.object({
  title: z.string(),
  description: z.string(),
  modules: z.array(z.object({
    title: z.string(),
    description: z.string(),
    lessons: z.array(z.string()).min(2).max(8),
  })).min(3).max(8),
});

const quizInput = z.object({
  topic: z.string().min(2).max(120),
  questionCount: z.coerce.number().int().min(1).max(10).default(5),
});

const quizOutput = z.object({
  title: z.string(),
  questions: z.array(z.object({
    text: z.string(),
    type: z.enum(["multiple_choice", "true_false", "fill_blank"]),
    options: z.array(z.string()).default([]),
    correctAnswer: z.string(),
    explanation: z.string(),
  })).min(1).max(10),
});

const flashcardsInput = z.object({
  topic: z.string().min(2).max(120),
  count: z.coerce.number().int().min(1).max(20).default(10),
});

const flashcardsOutput = z.object({
  flashcards: z.array(z.object({
    front: z.string(),
    back: z.string(),
  })).min(1).max(20),
});

const summaryInput = z.object({
  content: z.string().min(30).max(20_000),
});

const summaryOutput = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).min(3).max(10),
});

const studyPlanInput = z.object({
  goal: z.string().min(2).max(240).default("Complete the course successfully"),
  availableHoursPerWeek: z.coerce.number().min(1).max(40).default(5),
  durationWeeks: z.coerce.number().int().min(1).max(12).default(4),
});

const studyPlanOutput = z.object({
  weeks: z.array(z.object({
    week: z.number(),
    tasks: z.array(z.object({
      day: z.string(),
      title: z.string(),
      estimatedMinutes: z.number(),
      lessonId: z.number().nullable(),
    })),
  })).min(1).max(12),
});

const chatInput = z.object({
  message: z.string().min(1).max(4000),
  courseId: z.number().optional(),
});

const chatOutput = z.object({
  message: z.string(),
});

function getProvider(): AIProvider {
  return process.env["OPENAI_API_KEY"] ? new OpenAIProvider() : new MissingAIProvider();
}

async function runAI<T extends z.ZodTypeAny>(
  feature: string,
  outputSchema: T,
  system: string,
  user: string,
) {
  const provider = getProvider();
  const result = await provider.generateJson({ feature, system, user });
  return outputSchema.parse(result);
}

router.post("/ai/generate-course-outline", requireAuth, aiLimiter, async (req, res) => {
  const parsed = courseOutlineInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI course outline request", issues: parsed.error.issues }); return; }
  const { topic, level, targetAudience } = parsed.data;

  try {
    const result = await runAI(
      "course-outline",
      courseOutlineOutput,
      "You are an expert LMS instructional designer creating practical, production-ready course outlines.",
      `Create a ${level} course outline about "${topic}" for ${targetAudience}. Include 5 to 6 modules with clear lesson titles.`,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "course-outline");
  }
});

router.post("/ai/generate-quiz", requireAuth, aiLimiter, async (req, res) => {
  const parsed = quizInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI quiz request", issues: parsed.error.issues }); return; }
  const { topic, questionCount } = parsed.data;

  try {
    const result = await runAI(
      "quiz-generator",
      quizOutput,
      "You create LMS assessment questions with clear answer keys and concise explanations.",
      `Generate ${questionCount} assessment questions about "${topic}". Use a mix of multiple_choice, true_false, and fill_blank when appropriate.`,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "quiz-generator");
  }
});

router.post("/ai/generate-flashcards", requireAuth, aiLimiter, async (req, res) => {
  const parsed = flashcardsInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI flashcards request", issues: parsed.error.issues }); return; }
  const { topic, count } = parsed.data;

  try {
    const result = await runAI(
      "flashcards",
      flashcardsOutput,
      "You create concise study flashcards for LMS learners.",
      `Create ${count} flashcards about "${topic}". Keep fronts short and backs useful for recall.`,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "flashcards");
  }
});

router.post("/ai/summarize-lesson", requireAuth, aiLimiter, async (req, res) => {
  const parsed = summaryInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI summary request", issues: parsed.error.issues }); return; }

  try {
    const result = await runAI(
      "lesson-summary",
      summaryOutput,
      "You summarize LMS lessons for students. Preserve important concepts and action items.",
      `Summarize this lesson content and extract key points:\n\n${parsed.data.content}`,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "lesson-summary");
  }
});

router.post("/ai/study-plan", requireAuth, aiLimiter, async (req, res) => {
  const parsed = studyPlanInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI study plan request", issues: parsed.error.issues }); return; }
  const { goal, availableHoursPerWeek, durationWeeks } = parsed.data;

  try {
    const result = await runAI(
      "study-plan",
      studyPlanOutput,
      "You create realistic LMS study plans with weekly tasks and reasonable time estimates.",
      `Create a ${durationWeeks}-week study plan for this goal: "${goal}". The learner has ${availableHoursPerWeek} hours per week.`,
    );
    res.json(result);
  } catch (error) {
    handleAIError(req, res, error, "study-plan");
  }
});

router.post("/ai/chat", requireAuth, aiLimiter, async (req, res) => {
  const parsed = chatInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid AI chat request", issues: parsed.error.issues }); return; }

  try {
    const result = await runAI(
      "learning-assistant",
      chatOutput,
      "You are SkillForge AI's learning assistant. Give clear, supportive, course-safe tutoring guidance without pretending to access unavailable private data.",
      parsed.data.message,
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
      requiredEnv: ["OPENAI_API_KEY"],
    });
    return;
  }

  req.log.error({ err: error, feature }, "AI provider request failed");
  if (error instanceof AIProviderRequestError) {
    res.status(error.status).json({ error: "AI provider request failed", feature });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(502).json({ error: "AI provider returned an unexpected response shape", feature });
    return;
  }
  res.status(500).json({ error: "Internal server error", feature });
}

function extractResponsesText(output: unknown) {
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output as Array<{ content?: Array<{ text?: string }> }>) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

export default router;
