import React from "react";
import { Link } from "wouter";
import { useGetCourses } from "@workspace/api-client-react/api";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CourseCard } from "@/components/shared/CourseCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, Brain, Trophy, Users } from "lucide-react";

export default function Home() {
  const { data: popularCourses, isLoading } = useGetCourses({ sortBy: 'popular', limit: 6, published: true });
  const heroImage = popularCourses?.courses?.find((course) => course.bannerUrl || course.thumbnailUrl);
  
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 max-w-2xl">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                <SparklesIcon className="w-4 h-4 mr-2 text-primary" />
                AI-Powered Learning
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-serif tracking-tighter leading-[1.1]">
                Master new skills <br/>
                <span className="text-primary">with AI precision.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                SkillForge AI personalizes your learning journey, generates custom study plans, and adapts to your pace. The most intelligent way to learn.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-14 px-8 text-base font-semibold" asChild>
                  <Link href="/courses">Explore Courses</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold" asChild>
                  <Link href="/register">Start for Free</Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-8 pt-4 border-t">
                <div>
                  <div className="text-3xl font-bold font-serif">15k+</div>
                  <div className="text-sm text-muted-foreground">Active Learners</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-serif">4.9/5</div>
                  <div className="text-sm text-muted-foreground">Average Rating</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-serif">200+</div>
                  <div className="text-sm text-muted-foreground">Expert Courses</div>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent rounded-3xl transform rotate-3 scale-105 opacity-50 blur-xl"></div>
              <div className="relative bg-card border rounded-3xl p-2 shadow-2xl">
                {heroImage ? (
                  <img
                    src={heroImage.bannerUrl || heroImage.thumbnailUrl || ""}
                    alt={heroImage.title}
                    className="rounded-2xl w-full h-[600px] object-cover"
                  />
                ) : (
                  <div className="rounded-2xl w-full h-[600px] bg-muted flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight mb-4">Why learn with SkillForge AI?</h2>
            <p className="text-lg text-muted-foreground">We combine expert instruction with cutting-edge AI tools to help you learn faster and retain more.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: "AI Study Plans", desc: "Get a personalized week-by-week study plan adapted to your schedule and learning speed." },
              { icon: BookOpen, title: "Smart Flashcards", desc: "Our AI automatically generates flashcards and summaries for every lesson you take." },
              { icon: Trophy, title: "Verified Certificates", desc: "Earn blockchain-verified certificates to showcase your skills to employers." }
            ].map((f, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-serif tracking-tight mb-4">Trending Courses</h2>
              <p className="text-lg text-muted-foreground">Join thousands of others learning these in-demand skills.</p>
            </div>
            <Button variant="ghost" className="hidden sm:flex group" asChild>
              <Link href="/courses">
                View all courses <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : popularCourses?.courses && popularCourses.courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularCourses.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No courses available at the moment.
            </div>
          )}
          
          <div className="mt-12 text-center sm:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/courses">View all courses</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold font-serif tracking-tight mb-6 text-white">Ready to forge your future?</h2>
          <p className="text-xl opacity-90 mb-10 text-primary-foreground/80">
            Join the community of professionals who are taking their careers to the next level.
          </p>
          <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold" asChild>
            <Link href="/register">Create Your Free Account</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
