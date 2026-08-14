import React from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetCourse,
  useEnrollCourse,
  useGetCourseProgress,
  getGetCourseQueryKey,
  getGetCourseProgressQueryKey,
} from "@workspace/api-client-react/api";
import { useAuth } from "@/hooks/use-auth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import {
  Star, Clock, Users, PlayCircle, FileText, CheckCircle2,
  Award, Brain, BookOpen, ChevronDown, ChevronRight,
  HelpCircle, Lock, Globe, Download, File, Video, ClipboardList,
  AlertCircle
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function lessonIcon(type: string) {
  switch (type) {
    case "video": return <Video className="w-3.5 h-3.5" />;
    case "quiz": return <Brain className="w-3.5 h-3.5" />;
    case "assignment": return <ClipboardList className="w-3.5 h-3.5" />;
    case "resource": return <File className="w-3.5 h-3.5" />;
    case "exam": return <Award className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseParam = id || "";
  const numericCourseId = /^\d+$/.test(courseParam) ? parseInt(courseParam, 10) : 0;
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: numericCourse, isLoading: numericCourseLoading } = useGetCourse(numericCourseId, {
    query: { enabled: !!numericCourseId, queryKey: getGetCourseQueryKey(numericCourseId) },
  });

  const { data: slugCourse, isLoading: slugCourseLoading } = useQuery({
    enabled: !!courseParam && !numericCourseId,
    queryKey: ["course-by-slug", courseParam],
    queryFn: async () => {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      const response = await fetch(`${apiBase}/api/courses/slug/${encodeURIComponent(courseParam)}`);
      if (!response.ok) throw new Error("Course not found");
      return response.json();
    },
  });

  const course = numericCourse || slugCourse;
  const courseId = Number((course as any)?.id || numericCourseId || 0);

  const { data: progress } = useGetCourseProgress(courseId, {
    query: { enabled: !!courseId && isAuthenticated, queryKey: getGetCourseProgressQueryKey(courseId) },
  });

  const enrollMutation = useEnrollCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Enrolled! Let's start learning." });
        queryClient.invalidateQueries({ queryKey: getGetCourseProgressQueryKey(courseId) });
        setLocation(`/learn/${courseId}`);
      },
      onError: () => toast({ title: "Enrollment failed", variant: "destructive" }),
    },
  });

  const handleEnroll = () => {
    if (!isAuthenticated) { setLocation(`/login?redirect=/courses/${courseParam}`); return; }
    enrollMutation.mutate({ data: { courseId } });
  };

  const courseLoading = numericCourseLoading || slugCourseLoading;

  if (courseLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" /> <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!course) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <Button asChild><Link href="/courses">Browse courses</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const c = course as any;
  const isEnrolled = !!progress;
  const isInstructor = user?.role === "instructor" && c.instructorId === user?.id;
  const isAdmin = user?.role === "admin";
  const totalHours = Math.round((c.totalDuration || 0) / 60);

  return (
    <PublicLayout>
      {/* Banner / Hero */}
      {c.bannerUrl || c.thumbnailUrl ? (
        <div className="relative h-56 md:h-72 overflow-hidden">
          <img
            src={c.bannerUrl || c.thumbnailUrl || "/images/courses/default-course.jpg"}
            alt={`${c.title} course banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 md:px-6 pb-8">
              <HeroContent c={c} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-slate-50 py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <HeroContent c={c} />
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid md:grid-cols-3 gap-12">
          {/* ── Left column ── */}
          <div className="md:col-span-2 space-y-12">

            {/* About */}
            {c.description && (
              <section>
                <h2 className="text-2xl font-bold font-serif mb-4">About this course</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.description}</div>
              </section>
            )}

            {/* Outcomes */}
            {c.outcomes?.length > 0 && (
              <section className="bg-muted/50 p-6 md:p-8 rounded-2xl border">
                <h2 className="text-2xl font-bold font-serif mb-6">What you'll learn</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {c.outcomes.map((o: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{o}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Curriculum */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-serif">Curriculum</h2>
                <div className="text-sm text-muted-foreground">
                  {c.modules?.length || 0} modules · {c.totalLessons || 0} lessons
                  {totalHours > 0 && ` · ${totalHours}h total`}
                </div>
              </div>
              {c.modules?.length > 0 ? (
                <Accordion type="multiple" defaultValue={c.modules.slice(0, 2).map((m: any) => `mod-${m.id}`)} className="space-y-3">
                  {c.modules.map((mod: any, mi: number) => (
                    <AccordionItem key={mod.id} value={`mod-${mod.id}`} className="border rounded-xl bg-card px-2">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left flex-1">
                          <span className="font-semibold">Module {mi + 1}: {mod.title}</span>
                          <Badge variant="secondary" className="font-normal text-xs shrink-0">
                            {mod.lessons?.length || 0} lessons
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pb-4">
                        <div className="space-y-1.5 mt-1 ml-2 pl-4 border-l-2 border-muted">
                          {mod.lessons?.map((lesson: any, li: number) => (
                            <div key={lesson.id} className="flex items-center justify-between py-1.5 group">
                              <div className="flex items-center gap-2.5">
                                <span className={cn("text-muted-foreground/60", lesson.isFree && "text-primary/80")}>
                                  {lessonIcon(lesson.type)}
                                </span>
                                <span className={cn("text-sm", lesson.isFree ? "font-medium" : "text-muted-foreground")}>
                                  {mi + 1}.{li + 1} {lesson.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {lesson.isFree && <Badge variant="outline" className="text-[10px] h-4">Free</Badge>}
                                {lesson.type === "exam" && <Badge variant="destructive" className="text-[10px] h-4">Exam</Badge>}
                                {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}m</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No curriculum modules have been added yet.</p>
                </div>
              )}
            </section>

            {/* Requirements */}
            {c.requirements?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold font-serif mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {c.requirements.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/50" /> {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Prerequisites */}
            {c.prerequisites?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold font-serif mb-4">Prerequisites</h2>
                <div className="flex flex-wrap gap-2">
                  {c.prerequisites.map((p: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm py-1 px-3">{p}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {c.faqs?.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold font-serif mb-6">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {c.faqs.map((faq: any, i: number) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4">
                      <AccordionTrigger className="hover:no-underline text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="md:col-span-1">
            <div className="sticky top-24 bg-card rounded-2xl border shadow-xl overflow-hidden md:-mt-48 z-10">
              {/* Preview media */}
              {c.previewVideoUrl ? (
                <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                  <video src={c.previewVideoUrl} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-primary transition-colors">
                      <PlayCircle className="w-7 h-7 text-white fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 text-white font-semibold text-center w-full text-xs">Preview this course</div>
                </div>
              ) : (
                <img
                  src={c.thumbnailUrl || "/images/courses/default-course.jpg"}
                  alt={`${c.title} course thumbnail`}
                  className="w-full aspect-video object-cover"
                />
              )}

              <div className="p-6 space-y-5">
                {isEnrolled ? (
                  <>
                    <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-3 rounded-xl flex items-center gap-2 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" /> You're enrolled!
                    </div>
                    <Button size="lg" className="w-full font-bold h-12" asChild>
                      <Link href={`/learn/${c.id}`}>Continue Learning →</Link>
                    </Button>
                    <div className="text-center text-xs text-muted-foreground">
                      {(progress as any)?.progressPercent || 0}% complete
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold">
                          {c.price === 0 ? "Free" : `$${c.discountPrice || c.price}`}
                        </span>
                        {c.discountPrice && c.discountPrice < c.price && (
                          <span className="text-lg text-muted-foreground line-through">${c.price}</span>
                        )}
                      </div>
                      {c.discountPrice && c.discountPrice < c.price && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          Save {Math.round((1 - c.discountPrice / c.price) * 100)}% — limited time offer
                        </p>
                      )}
                    </div>
                    <Button
                      size="lg" className="w-full h-12 font-bold"
                      onClick={handleEnroll} disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? "Enrolling…" : c.price === 0 ? "Enroll for Free" : "Enroll Now"}
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      30-day money-back guarantee · Full lifetime access
                    </p>
                  </>
                )}

                {(isInstructor || isAdmin) && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/instructor/courses/${c.id}/edit`}>✏️ Edit Course</Link>
                  </Button>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold text-sm mb-3">This course includes:</h4>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {totalHours > 0 && (
                      <div className="flex items-center gap-2.5"><PlayCircle className="w-4 h-4 shrink-0" />{totalHours}h on-demand video</div>
                    )}
                    {c.totalLessons > 0 && (
                      <div className="flex items-center gap-2.5"><FileText className="w-4 h-4 shrink-0" />{c.totalLessons} lessons</div>
                    )}
                    <div className="flex items-center gap-2.5"><Download className="w-4 h-4 shrink-0" />Downloadable resources</div>
                    <div className="flex items-center gap-2.5"><Brain className="w-4 h-4 shrink-0" />Quizzes & assignments</div>
                    {c.hasCertificate !== false && (
                      <div className="flex items-center gap-2.5"><Award className="w-4 h-4 shrink-0 text-amber-500" />Certificate of completion</div>
                    )}
                    <div className="flex items-center gap-2.5"><Globe className="w-4 h-4 shrink-0" />Full lifetime access</div>
                  </div>
                </div>

                {c.tags?.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-1.5">
                      {c.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function HeroContent({ c }: { c: any }) {
  return (
    <div className="grid md:grid-cols-3 gap-8 items-center">
      <div className="md:col-span-2 space-y-5 text-slate-50">
        <div className="flex flex-wrap gap-2">
          {c.categoryName && (
            <Badge className="bg-primary/30 text-primary-foreground border-none font-semibold">{c.categoryName}</Badge>
          )}
          <Badge variant="outline" className="text-slate-300 border-slate-600 capitalize">{c.level}</Badge>
          {c.isPublished ? (
            <Badge variant="outline" className="text-green-400 border-green-700"><Globe className="w-3 h-3 mr-1" />Published</Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-400 border-yellow-700"><Lock className="w-3 h-3 mr-1" />Draft</Badge>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-serif leading-tight">{c.title}</h1>

        <p className="text-slate-300 text-base leading-relaxed max-w-2xl">
          {c.shortDescription || c.description?.slice(0, 180)}
        </p>

        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <span className="font-bold text-slate-200">{c.rating?.toFixed(1) || "New"}</span>
            {c.reviewCount > 0 && <span>({c.reviewCount} reviews)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />{c.enrollmentCount || 0} students
          </div>
          {c.totalDuration > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />{Math.round(c.totalDuration / 60)}h total
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Avatar className="h-10 w-10 border-2 border-slate-700">
            <AvatarImage src={c.instructorAvatar || "/images/avatars/default-avatar.jpg"} />
            <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
              {c.instructorName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-xs text-slate-400">Created by</div>
            <div className="font-semibold text-slate-200 text-sm">{c.instructorName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
