import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MediaUpload } from "./MediaUpload";
import { useToast } from "@/components/ui/toast";
import {
  Video, FileText, ClipboardList, File, Award, Plus, Trash2,
  CheckCircle2, Circle
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id?: number;
  text: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  options: Option[];
  correctAnswer: string;
  explanation: string;
  points: number;
  position: number;
}

interface DownloadableFile {
  name: string;
  url: string;
  size?: number;
}

interface LessonEditorDialogProps {
  moduleId: number;
  lesson?: any;
  onClose: () => void;
  onSaved: () => void;
}

const LESSON_TYPES = [
  { value: "video", label: "Video", icon: <Video className="w-4 h-4" />, description: "Upload or link a video lesson" },
  { value: "text", label: "Text", icon: <FileText className="w-4 h-4" />, description: "Written content, notes, or article" },
  { value: "resource", label: "PDF / Resource", icon: <File className="w-4 h-4" />, description: "PDF, downloadable files, links" },
  { value: "quiz", label: "Quiz", icon: <ClipboardList className="w-4 h-4" />, description: "Multiple-choice questions with scoring" },
  { value: "assignment", label: "Assignment", icon: <ClipboardList className="w-4 h-4" />, description: "Written submission or file upload" },
  { value: "exam", label: "Final Exam", icon: <Award className="w-4 h-4" />, description: "Graded final exam for the course" },
];

function newQuestion(position: number): Question {
  return {
    text: "",
    type: "multiple_choice",
    options: [
      { id: crypto.randomUUID(), text: "", isCorrect: true },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
      { id: crypto.randomUUID(), text: "", isCorrect: false },
    ],
    correctAnswer: "",
    explanation: "",
    points: 1,
    position,
  };
}

export function LessonEditorDialog({ moduleId, lesson, onClose, onSaved }: LessonEditorDialogProps) {
  const { toast } = useToast();
  const isEditing = !!lesson;

  const [title, setTitle] = useState(lesson?.title || "");
  const [type, setType] = useState<string>(lesson?.type || "video");
  const [content, setContent] = useState(lesson?.content || "");
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || "");
  const [pdfUrl, setPdfUrl] = useState(lesson?.pdfUrl || "");
  const [resourceUrl, setResourceUrl] = useState(lesson?.resourceUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.thumbnailUrl || "");
  const [duration, setDuration] = useState<number | "">(lesson?.duration || "");
  const [isFree, setIsFree] = useState(lesson?.isFree || false);
  const [isExam, setIsExam] = useState(lesson?.isExam || type === "exam");
  const [downloadableFiles, setDownloadableFiles] = useState<DownloadableFile[]>(lesson?.downloadableFiles || []);
  const [saving, setSaving] = useState(false);

  // Quiz/Exam questions
  const [questions, setQuestions] = useState<Question[]>([newQuestion(0)]);
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState<number | "">(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | "">(3);
  const [quizLoaded, setQuizLoaded] = useState(false);

  // Assignment fields
  const [instructions, setInstructions] = useState(lesson?.instructions || "");
  const [submissionType, setSubmissionType] = useState("text");
  const [dueDate, setDueDate] = useState("");

  // Load existing quiz questions
  useEffect(() => {
    if (isEditing && (type === "quiz" || type === "exam") && lesson?.id && !quizLoaded) {
      const token = localStorage.getItem("sf_token");
      fetch(`${API_BASE}/api/lessons/${lesson.id}/quiz`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.questions?.length > 0) {
            setQuestions(data.questions);
            setPassingScore(data.passingScore || 70);
            setTimeLimit(data.timeLimit || "");
            setShuffleQuestions(data.shuffleQuestions || false);
            setMaxAttempts(data.maxAttempts || 3);
          }
          setQuizLoaded(true);
        })
        .catch(() => setQuizLoaded(true));
    }
  }, [isEditing, type, lesson]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, newQuestion(prev.length)]);
  };

  const updateQuestion = (i: number, updates: Partial<Question>) => {
    setQuestions(prev => prev.map((q, j) => j === i ? { ...q, ...updates } : q));
  };

  const removeQuestion = (i: number) => {
    setQuestions(prev => prev.filter((_, j) => j !== i).map((q, j) => ({ ...q, position: j })));
  };

  const toggleCorrect = (qIdx: number, optId: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return {
        ...q,
        options: q.options.map(o => ({ ...o, isCorrect: o.id === optId })),
      };
    }));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", isCorrect: false }] };
    }));
  };

  const updateOption = (qIdx: number, optId: string, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) };
    }));
  };

  const addDownloadableFile = (url: string, name: string) => {
    setDownloadableFiles(prev => [...prev, { name, url }]);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);

    const token = localStorage.getItem("sf_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // 1. Save/update the lesson
      const lessonPayload = {
        title: title.trim(),
        type,
        content: content || null,
        videoUrl: videoUrl || null,
        pdfUrl: pdfUrl || null,
        resourceUrl: resourceUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration ? Number(duration) : null,
        isFree,
        isExam: type === "exam" || isExam,
        downloadableFiles,
      };

      let savedLesson: any;
      if (isEditing) {
        const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}`, {
          method: "PATCH", headers, body: JSON.stringify(lessonPayload),
        });
        savedLesson = await res.json();
      } else {
        const res = await fetch(`${API_BASE}/api/modules/${moduleId}/lessons`, {
          method: "POST", headers, body: JSON.stringify(lessonPayload),
        });
        savedLesson = await res.json();
      }

      // 2. If quiz or exam, save quiz data
      if (type === "quiz" || type === "exam") {
        const courseRes = await fetch(`${API_BASE}/api/lessons/${savedLesson.id}/quiz`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const validQuestions = questions.filter(q => q.text.trim());
        const quizPayload = {
          title,
          passingScore: Number(passingScore),
          timeLimit: timeLimit ? Number(timeLimit) : null,
          shuffleQuestions,
          maxAttempts: maxAttempts ? Number(maxAttempts) : 3,
          isFinalExam: type === "exam",
          questions: validQuestions,
        };

        if (courseRes.ok) {
          const existing = await courseRes.json();
          await fetch(`${API_BASE}/api/quizzes/${existing.id}`, {
            method: "PATCH", headers, body: JSON.stringify(quizPayload),
          });
        } else {
          // Get courseId from module
          const modRes = await fetch(`${API_BASE}/api/modules/${moduleId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const modData = await modRes.json();
          await fetch(`${API_BASE}/api/courses/${modData.courseId}/quizzes`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...quizPayload, lessonId: savedLesson.id }),
          });
        }
      }

      // 3. If assignment, save assignment data
      if (type === "assignment") {
        const assignPayload = {
          title,
          description: content || null,
          instructions: instructions || null,
          submissionType,
          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
          maxScore: 100,
          lessonId: savedLesson.id,
        };
        // Create assignment linked to this lesson if it doesn't exist
        if (!isEditing) {
          const modRes = await fetch(`${API_BASE}/api/modules/${moduleId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const modData = await modRes.json();
          await fetch(`${API_BASE}/api/courses/${modData.courseId}/assignments`, {
            method: "POST", headers, body: JSON.stringify(assignPayload),
          });
        }
      }

      toast({ title: isEditing ? "Lesson updated!" : "Lesson created!" });
      onSaved();
    } catch (e) {
      toast({ title: "Failed to save lesson", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isQuizType = type === "quiz" || type === "exam";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl">{isEditing ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Lesson type selector (only for new lessons) */}
          {!isEditing && (
            <div>
              <Label className="mb-3 block text-sm font-medium">Lesson Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LESSON_TYPES.map(lt => (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => { setType(lt.value); if (lt.value === "exam") setIsExam(true); }}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left text-sm transition-colors ${
                      type === lt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <span className={`mt-0.5 ${type === lt.value ? "text-primary" : "text-muted-foreground"}`}>{lt.icon}</span>
                    <div>
                      <div className="font-medium leading-tight">{lt.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{lt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Title + Common Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="lesson-title">Title *</Label>
              <Input id="lesson-title" className="mt-1.5" placeholder="e.g. Introduction to React Hooks" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="free-toggle" checked={isFree} onCheckedChange={setIsFree} />
                <Label htmlFor="free-toggle" className="cursor-pointer text-sm">Free preview</Label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="duration" className="text-sm text-muted-foreground">Duration (min)</Label>
                  <Input
                    id="duration" type="number" min="0" className="w-20 h-8 text-sm"
                    value={duration} onChange={e => setDuration(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Video lesson */}
          {type === "video" && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Video</Label>
                <MediaUpload
                  type="video"
                  label="Upload Video"
                  hint="MP4, WebM, MOV up to 2GB"
                  currentUrl={videoUrl || null}
                  onUploaded={(url) => setVideoUrl(url)}
                  onRemove={() => setVideoUrl("")}
                />
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground mb-1 block">— or paste a video URL —</Label>
                  <Input placeholder="https://example.com/lesson.mp4" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Lesson Thumbnail (optional)</Label>
                <MediaUpload
                  type="image"
                  label="Upload Thumbnail"
                  hint="Shown as video poster image"
                  currentUrl={thumbnailUrl || null}
                  onUploaded={(url) => setThumbnailUrl(url)}
                  onRemove={() => setThumbnailUrl("")}
                />
              </div>
              <div>
                <Label htmlFor="lesson-notes">Lesson Notes / Description</Label>
                <Textarea id="lesson-notes" className="mt-1.5 min-h-[120px]" placeholder="Notes, key points, or transcript…" value={content} onChange={e => setContent(e.target.value)} />
              </div>
            </div>
          )}

          {/* Text lesson */}
          {type === "text" && (
            <div>
              <Label>Content</Label>
              <Textarea className="mt-1.5 min-h-[260px] font-mono text-sm" placeholder="Write your lesson content here. Markdown is supported." value={content} onChange={e => setContent(e.target.value)} />
            </div>
          )}

          {/* PDF / Resource lesson */}
          {type === "resource" && (
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">Primary PDF</Label>
                <MediaUpload
                  type="pdf"
                  label="Upload PDF"
                  hint="PDF documents up to 100MB"
                  currentUrl={pdfUrl || null}
                  onUploaded={(url) => setPdfUrl(url)}
                  onRemove={() => setPdfUrl("")}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Downloadable Files</Label>
                  <MediaUpload
                    type="file"
                    label="Upload File"
                    currentUrl={null}
                    onUploaded={(url) => addDownloadableFile(url, url.split("/").pop() || "file")}
                    className="w-auto"
                  />
                </div>
                {downloadableFiles.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {downloadableFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/40 rounded border text-sm">
                        <File className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => setDownloadableFiles(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="resource-notes">Description</Label>
                <Textarea id="resource-notes" className="mt-1.5 h-24" placeholder="Describe what these resources contain…" value={content} onChange={e => setContent(e.target.value)} />
              </div>
            </div>
          )}

          {/* Quiz / Exam */}
          {isQuizType && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Passing Score (%)</Label>
                  <Input type="number" min="0" max="100" className="mt-1.5" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Time Limit (min)</Label>
                  <Input type="number" min="0" className="mt-1.5" placeholder="Unlimited" value={timeLimit} onChange={e => setTimeLimit(e.target.value ? parseInt(e.target.value) : "")} />
                </div>
                <div>
                  <Label>Max Attempts</Label>
                  <Input type="number" min="1" className="mt-1.5" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value ? parseInt(e.target.value) : "")} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                <Label className="text-sm cursor-pointer">Shuffle question order</Label>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Questions ({questions.length})</Label>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={addQuestion}>
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </Button>
                </div>

                {questions.map((q, qi) => (
                  <div key={qi} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold text-muted-foreground mt-2 w-5 shrink-0">Q{qi + 1}</span>
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter question text…"
                            value={q.text}
                            onChange={e => updateQuestion(qi, { text: e.target.value })}
                            className="flex-1"
                          />
                          <Select value={q.type} onValueChange={v => updateQuestion(qi, { type: v as any })}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                              <SelectItem value="true_false">True / False</SelectItem>
                              <SelectItem value="fill_blank">Fill in blank</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" min="1" className="w-16" placeholder="pts" value={q.points} onChange={e => updateQuestion(qi, { points: parseInt(e.target.value) || 1 })} />
                        </div>

                        {q.type === "multiple_choice" && (
                          <div className="space-y-2">
                            {q.options.map((opt) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <button type="button" onClick={() => toggleCorrect(qi, opt.id)} className="shrink-0">
                                  {opt.isCorrect
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    : <Circle className="w-4 h-4 text-muted-foreground/50" />
                                  }
                                </button>
                                <Input
                                  placeholder={`Option…`}
                                  value={opt.text}
                                  onChange={e => updateOption(qi, opt.id, e.target.value)}
                                  className="flex-1 h-8 text-sm"
                                />
                              </div>
                            ))}
                            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => addOption(qi)}>
                              <Plus className="w-3 h-3" /> Add option
                            </Button>
                          </div>
                        )}

                        {q.type === "true_false" && (
                          <div className="flex gap-3">
                            {["True", "False"].map(v => (
                              <button key={v} type="button" onClick={() => updateQuestion(qi, { correctAnswer: v })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm transition-colors ${q.correctAnswer === v ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                                {q.correctAnswer === v ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                                {v}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === "fill_blank" && (
                          <Input placeholder="Correct answer…" value={q.correctAnswer} onChange={e => updateQuestion(qi, { correctAnswer: e.target.value })} />
                        )}

                        <Input
                          placeholder="Explanation (shown after answering)…"
                          value={q.explanation}
                          onChange={e => updateQuestion(qi, { explanation: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => removeQuestion(qi)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment */}
          {type === "assignment" && (
            <div className="space-y-4">
              <div>
                <Label>Assignment Description</Label>
                <Textarea className="mt-1.5 h-28" placeholder="What is this assignment about?" value={content} onChange={e => setContent(e.target.value)} />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea className="mt-1.5 h-32" placeholder="Step-by-step instructions for completing the assignment…" value={instructions} onChange={e => setInstructions(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Submission Type</Label>
                  <Select value={submissionType} onValueChange={setSubmissionType}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Written text</SelectItem>
                      <SelectItem value="file">File upload</SelectItem>
                      <SelectItem value="link">Link / URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" className="mt-1.5" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Update Lesson" : "Add Lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
