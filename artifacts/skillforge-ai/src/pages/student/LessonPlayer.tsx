import React, { useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetCourse,
  useGetCourseProgress,
  useCompleteLesson,
  getGetCourseQueryKey,
  getGetCourseProgressQueryKey,
} from "@workspace/api-client-react/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CheckCircle2, Circle, PlayCircle, FileText, Brain,
  ChevronLeft, ChevronRight, Menu, ArrowLeft, Download,
  File, Award, ClipboardList, Upload, Link2, Send, Lock,
  BookOpen, Video
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { resolveMediaUrl, downloadMedia } from "@/lib/media";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL || "").replace(/\/$/, "");

function isYouTubeUrl(url?: string | null): boolean {
  return !!url && /youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\//.test(url);
}

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

// ── Quiz Player (inline) ────────────────────────────────────────────────────
function InlineQuizPlayer({ lesson, courseId, onComplete }: { lesson: any; courseId: number; onComplete: () => void }) {
  const { toast } = useToast();
  const [quiz, setQuiz] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("sf_token");
    fetch(`${API_BASE}/api/lessons/${lesson.id}/quiz`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setQuiz(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lesson.id]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    const token = localStorage.getItem("sf_token");
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId: parseInt(questionId), answer })),
        }),
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      if (data.passed) { onComplete(); toast({ title: "Quiz passed! ✓" }); }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading quiz…</div>;
  if (!quiz) return (
    <div className="p-8 text-center">
      <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
      <p className="text-muted-foreground">Quiz content not yet configured by the instructor.</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Brain className="w-3.5 h-3.5" />
          {quiz.isFinalExam ? "Final Exam" : "Quiz"} · {quiz.questions?.length || 0} questions
          {quiz.timeLimit && ` · ${quiz.timeLimit} min time limit`}
        </div>
        <h2 className="text-2xl font-bold font-serif">{quiz.title}</h2>
        {quiz.description && <p className="text-muted-foreground mt-1">{quiz.description}</p>}
      </div>

      {submitted && result && (
        <div className={cn(
          "rounded-xl p-6 border-2 text-center",
          result.passed ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-400 bg-red-50 dark:bg-red-950/20"
        )}>
          {result.passed ? <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" /> : <Circle className="w-10 h-10 text-red-400 mx-auto mb-2" />}
          <div className="text-3xl font-bold mb-1">{Math.round(result.score)}%</div>
          <div className="font-semibold">{result.passed ? "Passed!" : "Not passed — try again"}</div>
          <div className="text-sm text-muted-foreground mt-1">Passing score: {quiz.passingScore}%</div>
          {!result.passed && (
            <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setAnswers({}); setResult(null); }}>
              Try Again
            </Button>
          )}
        </div>
      )}

      {!submitted && quiz.questions?.map((q: any, qi: number) => (
        <div key={q.id} className="border rounded-xl p-5 space-y-3">
          <div className="flex gap-3">
            <span className="text-xs font-bold text-muted-foreground mt-0.5 w-5 shrink-0">Q{qi + 1}</span>
            <p className="font-medium leading-snug">{q.text}</p>
          </div>

          {q.type === "multiple_choice" && (
            <RadioGroup
              value={answers[q.id] || ""}
              onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}
              className="space-y-2 ml-8"
            >
              {(q.options || []).map((opt: any) => (
                <div key={opt.id} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-muted">
                  <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                  <Label htmlFor={`${q.id}-${opt.id}`} className="cursor-pointer flex-1">{opt.text}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === "true_false" && (
            <RadioGroup value={answers[q.id] || ""} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))} className="flex gap-3 ml-8">
              {["True", "False"].map(v => (
                <div key={v} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors", answers[q.id] === v ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                  <RadioGroupItem value={v} id={`${q.id}-${v}`} />
                  <Label htmlFor={`${q.id}-${v}`} className="cursor-pointer">{v}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === "fill_blank" && (
            <Input
              className="ml-8 max-w-xs"
              placeholder="Your answer…"
              value={answers[q.id] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            />
          )}

          {submitted && result?.answers && (() => {
            const ans = result.answers.find((a: any) => a.questionId === q.id);
            if (!ans) return null;
            return (
              <div className={cn("ml-8 text-sm p-2 rounded", ans.isCorrect ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-red-600 bg-red-50 dark:bg-red-950/30")}>
                {ans.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                {q.explanation && <span className="ml-2 text-muted-foreground">— {q.explanation}</span>}
              </div>
            );
          })()}
        </div>
      ))}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length === 0} size="lg" className="w-full gap-2">
          <Send className="w-4 h-4" />
          {submitting ? "Submitting…" : "Submit Quiz"}
        </Button>
      )}
    </div>
  );
}

// ── Assignment Player (inline) ──────────────────────────────────────────────
function InlineAssignmentPlayer({ lesson, onComplete }: { lesson: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [assignment, setAssignment] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [submissionContent, setSubmissionContent] = React.useState("");
  const [submissionLink, setSubmissionLink] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("sf_token");
    fetch(`${API_BASE}/api/lessons/${lesson.id}/assignment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setAssignment(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lesson.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("sf_token");
    const uploadRes = await fetch(`${API_BASE}/api/storage/uploads`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name),
        "x-folder": "assignment-submissions",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("Upload failed");
    const { publicUrl, objectPath } = await uploadRes.json();
    setFileUrl(publicUrl || objectPath);
    toast({ title: "File uploaded!" });
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    const token = localStorage.getItem("sf_token");
    try {
      await fetch(`${API_BASE}/api/assignments/${assignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          content: submissionContent || submissionLink || "Submitted",
          fileUrl: fileUrl || null,
          linkUrl: submissionLink || null,
        }),
      });
      setSubmitted(true);
      onComplete();
      toast({ title: "Assignment submitted!" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading assignment…</div>;

  if (!assignment) return (
    <div className="p-8 text-center">
      <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
      <p className="text-muted-foreground">Assignment content not yet configured.</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <ClipboardList className="w-3.5 h-3.5" />
          Assignment · Max score: {assignment.maxScore} pts
        </div>
        <h2 className="text-2xl font-bold font-serif">{assignment.title}</h2>
        {assignment.description && <p className="text-muted-foreground mt-1">{assignment.description}</p>}
      </div>

      {assignment.instructions && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-1">
          <p className="text-sm font-medium">Instructions</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
        </div>
      )}

      {submitted ? (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/20 p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <div className="font-semibold">Assignment Submitted!</div>
          <p className="text-sm text-muted-foreground mt-1">Your instructor will review and grade your submission.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignment.submissionType === "text" && (
            <div>
              <Label>Your Response</Label>
              <Textarea
                className="mt-1.5 min-h-[200px]"
                placeholder="Write your response here…"
                value={submissionContent}
                onChange={e => setSubmissionContent(e.target.value)}
              />
            </div>
          )}

          {assignment.submissionType === "file" && (
            <div>
              <Label>Upload Your File</Label>
              <div className="mt-1.5">
                {fileUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/40 rounded border">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm truncate">{fileUrl.split("/").pop()}</span>
                    <Button variant="ghost" size="sm" onClick={() => setFileUrl("")}>Remove</Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">Click to upload your file</span>
                    <span className="text-xs">Any file type supported</span>
                  </button>
                )}
                <input ref={inputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          )}

          {assignment.submissionType === "link" && (
            <div>
              <Label>Submission Link</Label>
              <div className="relative mt-1.5">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="https://github.com/yourrepo or Google Docs link"
                  value={submissionLink}
                  onChange={e => setSubmissionLink(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || (!submissionContent && !fileUrl && !submissionLink)}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting…" : "Submit Assignment"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── PDF Viewer ──────────────────────────────────────────────────────────────
function PdfViewer({ url, title }: { url: string; title: string }) {
  const resolvedUrl = resolveMediaUrl(url);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-sm font-medium truncate">{title}</span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => downloadMedia(resolvedUrl)}
        >
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
      </div>
      <iframe src={resolvedUrl} className="flex-1 w-full" title={title} />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function LessonPlayer() {
  const { courseId } = useParams<{ courseId: string }>();
  const id = parseInt(courseId || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);

  const { data: course, isLoading: courseLoading } = useGetCourse(id, {
    query: { enabled: !!id && isAuthenticated, queryKey: getGetCourseQueryKey(id) },
  });

  const { data: progress } = useGetCourseProgress(id, {
    query: { enabled: !!id && isAuthenticated, queryKey: getGetCourseProgressQueryKey(id) },
  });

  const completeMutation = useCompleteLesson({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lesson marked complete ✓" });
        queryClient.invalidateQueries({ queryKey: getGetCourseProgressQueryKey(id) });
      },
    },
  });

  const allLessons = React.useMemo(() => {
    if (!course?.modules) return [];
    return (course.modules as any[]).flatMap((m: any) => m.lessons || []);
  }, [course]);

  const completedIds = React.useMemo(() => {
    const p = progress as any;
    return new Set<number>(p?.completedLessons ? p.completedLessonIds || [] : []);
  }, [progress]);

  React.useEffect(() => {
    if (activeLessonId === null && allLessons.length > 0) {
      const p = progress as any;
      setActiveLessonId(p?.lastLessonId || allLessons[0].id);
    }
  }, [allLessons, progress, activeLessonId]);

  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId);
  const idx = allLessons.findIndex((l: any) => l.id === activeLessonId);
  const prevLesson = idx > 0 ? allLessons[idx - 1] : null;
  const nextLesson = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  const isCompleted = activeLesson ? completedIds.has(activeLesson.id) : false;

  const handleComplete = () => {
    if (!activeLesson) return;
    completeMutation.mutate({ lessonId: activeLesson.id });
  };

  const lessonTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-3.5 h-3.5" />;
      case "quiz": case "exam": return <Brain className="w-3.5 h-3.5" />;
      case "assignment": return <ClipboardList className="w-3.5 h-3.5" />;
      case "resource": return <File className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-card border-r overflow-hidden">
      <div className="p-4 border-b shrink-0">
        <Link href="/dashboard" className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-3 gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="font-bold font-serif text-sm leading-snug line-clamp-2">{(course as any)?.title}</h2>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{(progress as any)?.progressPercent || 0}% complete</span>
            <span>{(progress as any)?.completedLessons || 0}/{(progress as any)?.totalLessons || allLessons.length}</span>
          </div>
          <Progress value={(progress as any)?.progressPercent || 0} className="h-1.5" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {(course as any)?.modules?.map((mod: any, i: number) => (
          <div key={mod.id} className="border-b last:border-0">
            <div className="px-4 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {i + 1}. {mod.title}
            </div>
            {mod.lessons?.map((lesson: any, j: number) => {
              const isActive = lesson.id === activeLessonId;
              const isDone = completedIds.has(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={cn(
                    "w-full flex items-start text-left gap-2.5 px-4 py-2.5 text-sm transition-colors border-l-2",
                    isActive
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Circle className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground/40")} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium leading-snug line-clamp-2", isActive ? "text-primary" : "text-foreground")}>
                      {lesson.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      {lessonTypeIcon(lesson.type)}
                      <span className="capitalize">{lesson.type === "exam" ? "Final Exam" : lesson.type}</span>
                      {lesson.duration && <span>· {lesson.duration}m</span>}
                      {lesson.isFree && <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0">Free</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  if (courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!course) return <div className="p-8 text-center text-muted-foreground">Course not found</div>;

  const renderLessonContent = () => {
    if (!activeLesson) return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a lesson to begin</p>
        </div>
      </div>
    );

    const l = activeLesson as any;

    switch (l.type) {
      case "video":
        return (
          <div className="flex flex-col h-full">
            {l.videoUrl ? (
              isYouTubeUrl(l.videoUrl) ? (
                <div className="w-full bg-black">
                  <div className="w-full max-w-4xl mx-auto aspect-video">
                    <iframe
                      key={getYouTubeEmbedUrl(l.videoUrl)}
                      src={getYouTubeEmbedUrl(l.videoUrl)}
                      title={l.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-black">
                  <video
                    key={l.videoUrl}
                    src={resolveMediaUrl(l.videoUrl)}
                    controls
                    className="w-full max-h-[55vh] object-contain"
                    poster={l.thumbnailUrl || (course as any).thumbnailUrl || undefined}
                    onEnded={handleComplete}
                  />
                </div>
              )
            ) : (
              <div className="w-full bg-black/5 border-b aspect-video flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PlayCircle className="w-16 h-16 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No video uploaded yet</p>
                </div>
              </div>
            )}
            <div className="p-6 md:p-10 max-w-4xl">
              <h1 className="text-2xl font-bold font-serif mb-4">{l.title}</h1>
              {l.content && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{l.content}</p>}
              {l.downloadableFiles?.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">Downloads</p>
                  {l.downloadableFiles.map((f: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => downloadMedia(f.url, f.name)}
                      className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/50 text-sm transition-colors group w-full text-left"
                    >
                      <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "text":
        return (
          <div className="p-6 md:p-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <FileText className="w-3.5 h-3.5" /> Reading
            </div>
            <h1 className="text-3xl font-bold font-serif mb-6">{l.title}</h1>
            {l.content ? (
              <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                {l.content}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No content added yet.</p>
            )}
          </div>
        );

      case "resource":
        return (
          <div className="h-full flex flex-col">
            {l.pdfUrl ? (
              <PdfViewer url={l.pdfUrl} title={l.title} />
            ) : (
              <div className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-6">
                <h1 className="text-2xl font-bold font-serif">{l.title}</h1>
                {l.content && <p className="text-muted-foreground">{l.content}</p>}
              </div>
            )}
            {l.downloadableFiles?.length > 0 && (
              <div className="p-6 border-t space-y-2">
                <p className="text-sm font-medium">Downloadable Files</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {l.downloadableFiles.map((f: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => downloadMedia(f.url, f.name)}
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 text-sm transition-colors group w-full text-left"
                    >
                      <File className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "quiz":
      case "exam":
        return <InlineQuizPlayer lesson={l} courseId={id} onComplete={handleComplete} />;

      case "assignment":
        return <InlineAssignmentPlayer lesson={l} onComplete={handleComplete} />;

      default:
        return (
          <div className="p-6 md:p-10 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold font-serif mb-4">{l.title}</h1>
            {l.content && <p className="text-muted-foreground">{l.content}</p>}
          </div>
        );
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b bg-card shrink-0">
        <Link href="/dashboard" className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="font-semibold text-sm truncate px-3">{(course as any)?.title}</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {renderLessonContent()}
        </div>

        {/* Footer nav */}
        <div className="shrink-0 border-t bg-card px-4 py-3 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => prevLesson && setActiveLessonId(prevLesson.id)} disabled={!prevLesson} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          <Button
            size="sm"
            variant={isCompleted ? "secondary" : "default"}
            onClick={handleComplete}
            disabled={completeMutation.isPending || isCompleted}
            className="gap-1.5 hidden sm:flex"
          >
            {isCompleted ? <><CheckCircle2 className="w-3.5 h-3.5" /> Completed</> : "Mark Complete"}
          </Button>

          <Button size="sm" onClick={() => nextLesson && setActiveLessonId(nextLesson.id)} disabled={!nextLesson} className="gap-1.5">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
