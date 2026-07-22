import React, { useState, useCallback } from "react";
import { Link, useLocation, useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetCourse,
  useCreateCourse,
  useUpdateCourse,
  useGetCategories,
  getGetCourseQueryKey,
} from "@workspace/api-client-react/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Plus, GripVertical, Settings, BookOpen,
  Image, Trash2, Video, FileText, ClipboardList, Award, HelpCircle,
  Eye, EyeOff, ChevronDown, ChevronRight, Edit2, Film, File,
  Globe, Lock
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MediaUpload } from "@/components/shared/MediaUpload";
import { LessonEditorDialog } from "@/components/shared/LessonEditorDialog";
import { ModuleEditorDialog } from "@/components/shared/ModuleEditorDialog";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL || "").replace(/\/$/, "");

const FALLBACK_CATEGORIES = [
  { id: 1, name: "Web Development" },
  { id: 2, name: "Artificial Intelligence" },
  { id: 3, name: "Data Analytics" },
  { id: 4, name: "Design" },
  { id: 5, name: "Business" },
];

const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  shortDescription: z.string().optional().default(""),
  description: z.string().optional().default(""),
  categoryId: z.number().min(1, "Please select a category"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  price: z.number().min(0).default(0),
  discountPrice: z.number().optional(),
  thumbnailUrl: z.string().optional().default(""),
  bannerUrl: z.string().optional().default(""),
  previewVideoUrl: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  requirements: z.string().optional().default(""),
  outcomes: z.string().optional().default(""),
  prerequisites: z.string().optional().default(""),
  hasCertificate: z.boolean().default(true),
});

type CourseFormValues = z.infer<typeof courseSchema>;

type FAQ = { question: string; answer: string };

const LESSON_TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5" />,
  text: <FileText className="w-3.5 h-3.5" />,
  quiz: <ClipboardList className="w-3.5 h-3.5" />,
  assignment: <ClipboardList className="w-3.5 h-3.5" />,
  resource: <File className="w-3.5 h-3.5" />,
  exam: <Award className="w-3.5 h-3.5" />,
};

const LESSON_TYPE_COLORS: Record<string, string> = {
  video: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  text: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  quiz: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  assignment: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  resource: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  exam: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function CourseBuilder() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const courseId = parseInt(id || "0", 10);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("details");
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [lessonEditing, setLessonEditing] = useState<{ moduleId: number; lesson?: any } | null>(null);
  const [moduleEditing, setModuleEditing] = useState<{ course: any; module?: any } | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const { data: categories } = useGetCategories();
  const categoryOptions = Array.isArray(categories) && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  const { data: course, isLoading: courseLoading, refetch: refetchCourse } = useGetCourse(courseId, {
    query: {
      enabled: !isNew,
      queryKey: getGetCourseQueryKey(courseId),
    },
  });

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      description: "",
      categoryId: 0,
      level: "beginner",
      price: 0,
      thumbnailUrl: "",
      bannerUrl: "",
      previewVideoUrl: "",
      tags: "",
      requirements: "",
      outcomes: "",
      prerequisites: "",
      hasCertificate: true,
    },
  });

  React.useEffect(() => {
    if (course && !isNew) {
      const c = course as any;
      form.reset({
        title: c.title || "",
        shortDescription: c.shortDescription || "",
        description: c.description || "",
        categoryId: c.categoryId || 0,
        level: c.level || "beginner",
        price: c.price || 0,
        discountPrice: c.discountPrice || undefined,
        thumbnailUrl: c.thumbnailUrl || "",
        bannerUrl: c.bannerUrl || "",
        previewVideoUrl: c.previewVideoUrl || "",
        tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
        requirements: Array.isArray(c.requirements) ? c.requirements.join("\n") : "",
        outcomes: Array.isArray(c.outcomes) ? c.outcomes.join("\n") : "",
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.join("\n") : "",
        hasCertificate: c.hasCertificate !== false,
      });
      if (Array.isArray(c.faqs)) setFaqs(c.faqs);
      // Expand all modules by default
      if (c.modules) setExpandedModules(new Set(c.modules.map((m: any) => m.id)));
    }
  }, [course, isNew]);

  const createMutation = useCreateCourse({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Course created!", description: "Now build your curriculum." });
        setLocation(`/instructor/courses/${data.id}/edit`);
      },
      onError: () => toast({ title: "Failed to create course", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course saved!" });
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      },
      onError: () => toast({ title: "Failed to save course", variant: "destructive" }),
    },
  });

  const onSubmit = (values: CourseFormValues) => {
    const payload = {
      ...values,
      tags: values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      requirements: values.requirements ? values.requirements.split("\n").map((r) => r.trim()).filter(Boolean) : [],
      outcomes: values.outcomes ? values.outcomes.split("\n").map((o) => o.trim()).filter(Boolean) : [],
      prerequisites: values.prerequisites ? values.prerequisites.split("\n").map((p) => p.trim()).filter(Boolean) : [],
      faqs,
      categoryId: Number(values.categoryId),
    };

    if (isNew) {
      createMutation.mutate({ data: payload as any });
    } else {
      updateMutation.mutate({ courseId, data: payload as any });
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;
    const c = course as any;
    setPublishLoading(true);
    try {
      const token = localStorage.getItem("sf_token");
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ isPublished: !c.isPublished }),
      });
      if (res.ok) {
        toast({ title: c.isPublished ? "Course unpublished" : "Course published!" });
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      }
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    const token = localStorage.getItem("sf_token");
    await fetch(`${API_BASE}/api/lessons/${lessonId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    toast({ title: "Lesson deleted" });
  };

  const handleDeleteModule = async (moduleId: number) => {
    const token = localStorage.getItem("sf_token");
    await fetch(`${API_BASE}/api/modules/${moduleId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    toast({ title: "Module deleted" });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const courseData = course as any;

  if (!isNew && courseLoading) {
    return (
      <AppLayout requiredRole="instructor">
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const thumbnailUrl = form.watch("thumbnailUrl");
  const bannerUrl = form.watch("bannerUrl");

  return (
    <AppLayout requiredRole="instructor">
      {lessonEditing && (
        <LessonEditorDialog
          moduleId={lessonEditing.moduleId}
          lesson={lessonEditing.lesson}
          onClose={() => setLessonEditing(null)}
          onSaved={() => {
            setLessonEditing(null);
            queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
          }}
        />
      )}
      {moduleEditing && (
        <ModuleEditorDialog
          courseId={courseId}
          module={moduleEditing.module}
          onClose={() => setModuleEditing(null)}
          onSaved={() => {
            setModuleEditing(null);
            queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
          }}
        />
      )}

      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/instructor/courses">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">{isNew ? "Create New Course" : "Edit Course"}</h1>
              <p className="text-sm text-muted-foreground">{isNew ? "Fill in the basics, then build your curriculum" : courseData?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={courseData?.isPublished || false}
                  onCheckedChange={handlePublishToggle}
                  disabled={publishLoading}
                />
                <Label className="text-sm flex items-center gap-1.5">
                  {courseData?.isPublished ? (
                    <><Globe className="w-3.5 h-3.5 text-green-500" /> Published</>
                  ) : (
                    <><Lock className="w-3.5 h-3.5 text-muted-foreground" /> Draft</>
                  )}
                </Label>
              </div>
            )}
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-11">
            <TabsTrigger value="details" className="gap-2 px-5">
              <Settings className="w-4 h-4" /> Details
            </TabsTrigger>
            <TabsTrigger value="curriculum" disabled={isNew} className="gap-2 px-5">
              <BookOpen className="w-4 h-4" /> Curriculum
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2 px-5">
              <Image className="w-4 h-4" /> Media & Pricing
            </TabsTrigger>
            <TabsTrigger value="faqs" className="gap-2 px-5">
              <HelpCircle className="w-4 h-4" /> FAQs
            </TabsTrigger>
          </TabsList>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details">
            <Form {...form}>
              <form className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Information</CardTitle>
                    <CardDescription>The core details visible on the course landing page.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title *</FormLabel>
                        <FormControl><Input placeholder="e.g. Complete Web Development Bootcamp" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="categoryId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {categoryOptions.map((c: any) => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Level *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">🟢 Beginner</SelectItem>
                              <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                              <SelectItem value="advanced">🔴 Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="shortDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="A brief 1-2 sentence summary shown in search results…" className="resize-none h-20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detailed course description. What will students learn? Who is this for?" className="min-h-[180px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="tags" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma-separated)</FormLabel>
                        <FormControl><Input placeholder="react, javascript, web development" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Learning Details</CardTitle>
                    <CardDescription>What students need to know and what they'll gain.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="requirements" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requirements (one per line)</FormLabel>
                          <FormControl>
                            <Textarea placeholder={"Basic HTML knowledge\nA computer with internet\nWillingness to learn"} className="h-[160px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="outcomes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>What students will learn (one per line)</FormLabel>
                          <FormControl>
                            <Textarea placeholder={"Build responsive websites\nMaster React hooks\nDeploy to production"} className="h-[160px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="prerequisites" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prerequisite Courses (one per line, optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder={"Introduction to Programming\nHTML & CSS Basics"} className="h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <FormField control={form.control} name="hasCertificate" render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <div>
                            <FormLabel className="cursor-pointer flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-500" /> Award Certificate on Completion
                            </FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">Students will receive a verifiable certificate when they complete this course.</p>
                          </div>
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </TabsContent>

          {/* ── CURRICULUM TAB ── */}
          <TabsContent value="curriculum">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Course Curriculum</h2>
                  <p className="text-sm text-muted-foreground">
                    {courseData?.modules?.length || 0} modules · {courseData?.totalLessons || 0} lessons
                  </p>
                </div>
                <Button onClick={() => setModuleEditing({ course: courseData })} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Module
                </Button>
              </div>

              {courseData?.modules?.length > 0 ? (
                <div className="space-y-3">
                  {courseData.modules.map((mod: any, modIdx: number) => {
                    const expanded = expandedModules.has(mod.id);
                    return (
                      <Card key={mod.id} className="overflow-hidden">
                        {/* Module header */}
                        <div className="flex items-center gap-3 p-4 bg-muted/40 border-b">
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          <button
                            className="flex items-center gap-2 flex-1 text-left font-semibold hover:text-primary transition-colors"
                            onClick={() => setExpandedModules(prev => {
                              const next = new Set(prev);
                              next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                              return next;
                            })}
                          >
                            {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                            <span>Module {modIdx + 1}: {mod.title}</span>
                            <Badge variant="secondary" className="ml-2 font-normal">
                              {mod.lessons?.length || 0} lessons
                            </Badge>
                          </button>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModuleEditing({ course: courseData, module: mod })}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteModule(mod.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 ml-1" onClick={() => setLessonEditing({ moduleId: mod.id })}>
                              <Plus className="w-3.5 h-3.5" /> Lesson
                            </Button>
                          </div>
                        </div>

                        {/* Lessons */}
                        {expanded && (
                          <div className="divide-y">
                            {mod.lessons?.length > 0 ? (
                              mod.lessons.map((lesson: any, lIdx: number) => (
                                <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 group transition-colors">
                                  <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                                  <span className="text-xs text-muted-foreground w-6 shrink-0">{lIdx + 1}.</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${LESSON_TYPE_COLORS[lesson.type] || LESSON_TYPE_COLORS.text}`}>
                                    {LESSON_TYPE_ICONS[lesson.type] || LESSON_TYPE_ICONS.text}
                                    {lesson.type}
                                  </span>
                                  <span className="flex-1 text-sm font-medium truncate">{lesson.title}</span>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {lesson.isFree && <Badge variant="outline" className="text-[10px] h-5">Free</Badge>}
                                    {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}m</span>}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLessonEditing({ moduleId: mod.id, lesson })}>
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center text-sm text-muted-foreground">
                                <p>No lessons yet.</p>
                                <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => setLessonEditing({ moduleId: mod.id })}>
                                  <Plus className="w-3.5 h-3.5" /> Add first lesson
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-1">Start building your curriculum</h3>
                    <p className="text-sm text-muted-foreground mb-6">Add modules to organize your content, then add lessons inside each module.</p>
                    <Button onClick={() => setModuleEditing({ course: courseData })} className="gap-2">
                      <Plus className="w-4 h-4" /> Add First Module
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── MEDIA & PRICING TAB ── */}
          <TabsContent value="media">
            <Form {...form}>
              <form className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Images</CardTitle>
                    <CardDescription>Upload high-quality images that represent your course.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label>Course Thumbnail</Label>
                      <p className="text-xs text-muted-foreground">Shown in course cards and search results. Recommended: 16:9, 1280×720px.</p>
                      <MediaUpload
                        type="image"
                        label="Upload Thumbnail"
                        hint="PNG, JPG, WebP up to 10MB"
                        currentUrl={thumbnailUrl}
                        onUploaded={(url) => form.setValue("thumbnailUrl", url)}
                        onRemove={() => form.setValue("thumbnailUrl", "")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Course Banner</Label>
                      <p className="text-xs text-muted-foreground">Large hero banner shown on the course detail page. Recommended: 1920×480px.</p>
                      <MediaUpload
                        type="image"
                        label="Upload Banner"
                        hint="PNG, JPG, WebP up to 10MB"
                        currentUrl={bannerUrl}
                        onUploaded={(url) => form.setValue("bannerUrl", url)}
                        onRemove={() => form.setValue("bannerUrl", "")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Promotional Video</CardTitle>
                    <CardDescription>A short preview video to attract students (optional).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="previewVideoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL (paste a direct link or upload below)</FormLabel>
                        <FormControl><Input placeholder="https://example.com/promo.mp4" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <Label className="mb-2 block text-muted-foreground text-sm">— or upload —</Label>
                      <MediaUpload
                        type="video"
                        label="Upload Promo Video"
                        hint="MP4, WebM up to 500MB"
                        currentUrl={form.watch("previewVideoUrl") || null}
                        onUploaded={(url) => form.setValue("previewVideoUrl", url)}
                        onRemove={() => form.setValue("previewVideoUrl", "")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                    <CardDescription>Set how much students pay to access your course.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <p className="text-xs text-muted-foreground">Set to 0 to make this course free.</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="discountPrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price ($) — optional</FormLabel>
                        <FormControl>
                          <Input
                            type="number" min="0" step="0.01"
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Shown as a strikethrough discount.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </form>
            </Form>
          </TabsContent>

          {/* ── FAQs TAB ── */}
          <TabsContent value="faqs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Answer common questions students might have before enrolling.</CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => setFaqs(prev => [...prev, { question: "", answer: "" }])}>
                  <Plus className="w-4 h-4" /> Add FAQ
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No FAQs yet. Add questions students commonly ask.</p>
                  </div>
                )}
                {faqs.map((faq, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Question</Label>
                          <Input
                            placeholder="e.g. Do I need prior experience?"
                            value={faq.question}
                            onChange={e => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, question: e.target.value } : f))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Answer</Label>
                          <Textarea
                            placeholder="Provide a clear, helpful answer…"
                            className="h-24 resize-none"
                            value={faq.answer}
                            onChange={e => setFaqs(prev => prev.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))}
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive mt-1 shrink-0"
                        onClick={() => setFaqs(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {faqs.length > 0 && (
                  <div className="pt-2">
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="gap-2">
                      <Save className="w-4 h-4" /> Save FAQs
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
