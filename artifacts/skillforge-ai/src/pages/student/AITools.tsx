import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { BookOpen, Brain, FileText, LayoutList, Sparkles, Wand2 } from "lucide-react";
import { 
  useGenerateCourseOutline, 
  useGenerateQuiz, 
  useGenerateFlashcards, 
  useSummarizeLesson 
} from "@workspace/api-client-react/api";

export default function AITools() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" /> AI Tools Hub
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Leverage our advanced AI models to accelerate your learning. Generate custom materials, summaries, and study plans instantly.
          </p>
        </div>

        <Tabs defaultValue="flashcards" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-[600px] h-auto p-1 mb-8">
            <TabsTrigger value="flashcards" className="py-2"><LayoutList className="w-4 h-4 mr-2" /> Flashcards</TabsTrigger>
            <TabsTrigger value="summarize" className="py-2"><FileText className="w-4 h-4 mr-2" /> Summarizer</TabsTrigger>
            <TabsTrigger value="quiz" className="py-2"><Brain className="w-4 h-4 mr-2" /> Quizzes</TabsTrigger>
            <TabsTrigger value="outline" className="py-2"><BookOpen className="w-4 h-4 mr-2" /> Outlines</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flashcards">
            <FlashcardGenerator />
          </TabsContent>
          
          <TabsContent value="summarize">
            <LessonSummarizer />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizGenerator />
          </TabsContent>

          <TabsContent value="outline">
            <OutlineGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Sub-components for each tool

function FlashcardGenerator() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  
  const generateMutation = useGenerateFlashcards({
    mutation: {
      onSuccess: (data) => setResult(data),
      onError: (error) => toast({ title: aiErrorMessage(error), variant: "destructive" }),
    }
  });

  const handleGenerate = () => {
    if (!topic) return;
    generateMutation.mutate({ data: { topic, count: 5 } });
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate Flashcards</CardTitle>
          <CardDescription>Enter a topic and AI will create study cards for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic or concepts</label>
            <Textarea 
              placeholder="e.g. React hooks, French regular verbs, Machine learning basics" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleGenerate} 
            disabled={!topic || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Flashcards"}
            {!generateMutation.isPending && <Wand2 className="w-4 h-4 ml-2" />}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {generateMutation.isPending ? (
          <div className="h-full min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center text-muted-foreground animate-pulse">
              <Sparkles className="w-8 h-8 mb-2" />
              <p>AI is thinking...</p>
            </div>
          </div>
        ) : result?.flashcards ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Your Flashcards</h3>
            <div className="grid gap-4">
              {result.flashcards.map((card: any, i: number) => (
                <div key={i} className="group h-44" style={{ perspective: "1000px" }}>
                  <div
                    className="relative w-full h-full transition-transform duration-500 group-hover:[transform:rotateY(180deg)]"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div
                      className="absolute inset-0 border-2 border-primary/25 bg-background rounded-xl p-6 flex items-center justify-center text-center shadow-sm"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <p className="font-semibold text-foreground leading-relaxed">{card.front}</p>
                      <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">Hover to flip</span>
                    </div>
                    <div
                      className="absolute inset-0 border-2 border-primary/30 bg-primary/10 rounded-xl p-6 flex items-center justify-center text-center shadow-sm"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <p className="text-sm font-semibold text-foreground leading-relaxed">{card.back}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 text-muted-foreground p-8 text-center">
            Results will appear here. The AI generates cards with a front (question/concept) and back (answer/definition).
          </div>
        )}
      </div>
    </div>
  );
}

function aiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "AI request failed";
  if (/too many requests/i.test(message)) {
    return "You have reached the AI rate limit. Please wait a minute and try again.";
  }
  if (/invalid ai summary request/i.test(message)) {
    return "Paste at least 30 characters before summarizing a lesson.";
  }
  if (/not configured/i.test(message)) {
    return "AI is not configured yet. Add a free AI provider key (GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY) to the server .env to enable this tool.";
  }
  return message;
}

function LessonSummarizer() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  
  const generateMutation = useSummarizeLesson({
    mutation: {
      onSuccess: (data) => setResult(data),
      onError: (error) => toast({ title: aiErrorMessage(error), variant: "destructive" }),
    }
  });

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Summarize Content</CardTitle>
          <CardDescription>Paste long text and get a concise summary with key points.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Paste text here..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[250px] resize-y"
          />
          <Button 
            className="w-full" 
            onClick={() => generateMutation.mutate({ data: { content } })} 
            disabled={content.trim().length < 30 || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Summarizing..." : "Summarize"}
            {!generateMutation.isPending && <Wand2 className="w-4 h-4 ml-2" />}
          </Button>
        </CardContent>
      </Card>

      <div>
        {generateMutation.isPending ? (
          <div className="h-full min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center text-muted-foreground animate-pulse">
              <Sparkles className="w-8 h-8 mb-2" />
              <p>AI is reading...</p>
            </div>
          </div>
        ) : result ? (
          <Card className="h-full bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-relaxed">{result.summary}</p>
              
              <div>
                <h4 className="font-semibold text-sm mb-3">Key Takeaways</h4>
                <ul className="space-y-2">
                  {result.keyPoints?.map((pt: string, i: number) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="mr-2 text-primary mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/20 text-muted-foreground p-8 text-center">
            Your summary and key takeaways will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

function QuizGenerator() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  
  const generateMutation = useGenerateQuiz({
    mutation: {
      onSuccess: (data) => setResult(data),
      onError: (error) => toast({ title: aiErrorMessage(error), variant: "destructive" }),
    }
  });

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate Practice Quiz</CardTitle>
          <CardDescription>Test your knowledge on any topic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            placeholder="e.g. World War II History" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <Button 
            className="w-full" 
            onClick={() => generateMutation.mutate({ data: { topic, questionCount: 3 } })} 
            disabled={!topic || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Quiz"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {result?.questions && (
          <div className="space-y-6">
            <h3 className="font-semibold text-xl">{result.title}</h3>
            {result.questions.map((q: any, i: number) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium leading-relaxed">{i+1}. {q.text}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {q.options.map((opt: string, j: number) => (
                      <div key={j} className={`p-3 rounded-lg border text-sm ${opt === q.correctAnswer ? 'bg-green-500/10 border-green-500/30 font-medium' : 'bg-card'}`}>
                        {opt} {opt === q.correctAnswer && <span className="float-right text-green-600 dark:text-green-400">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="mt-4 text-xs text-muted-foreground p-3 bg-muted rounded-lg border">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OutlineGenerator() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  
  const generateMutation = useGenerateCourseOutline({
    mutation: {
      onSuccess: (data) => setResult(data),
      onError: (error) => toast({ title: aiErrorMessage(error), variant: "destructive" }),
    }
  });

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Course Outline Builder</CardTitle>
          <CardDescription>Generate a structured curriculum for any topic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            placeholder="e.g. Advanced TypeScript Patterns" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <Button 
            className="w-full" 
            onClick={() => generateMutation.mutate({ data: { topic } })} 
            disabled={!topic || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Structuring..." : "Build Outline"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {result && (
          <Card className="bg-card">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>{result.title}</CardTitle>
              <CardDescription>{result.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {result.modules.map((mod: any, i: number) => (
                  <div key={i} className="p-6">
                    <h4 className="font-semibold mb-1">Module {i+1}: {mod.title}</h4>
                    {mod.description && <p className="text-sm text-muted-foreground mb-4">{mod.description}</p>}
                    <ul className="space-y-2 pl-2">
                      {mod.lessons.map((lesson: string, j: number) => (
                        <li key={j} className="text-sm flex items-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-primary/50 before:rounded-full before:mr-3">
                          {lesson}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
