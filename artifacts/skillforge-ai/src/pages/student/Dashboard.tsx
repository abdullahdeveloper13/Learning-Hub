import React from "react";
import { Link } from "wouter";
import { 
  useGetStudentDashboard,
  getGetStudentDashboardQueryKey
} from "@workspace/api-client-react/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/shared/CourseCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, BookOpen, Award, CheckCircle2, TrendingUp, ChevronRight, Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetStudentDashboard({
    query: {
      queryKey: getGetStudentDashboardQueryKey()
    }
  });

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-8">
        
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Pick up where you left off and track your progress.</p>
        </div>

        {/* Stats Row */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="h-24 p-6"><div className="animate-pulse bg-muted h-full w-full rounded" /></CardContent></Card>
            ))}
          </div>
        ) : dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Enrolled Courses</p>
                    <h3 className="text-3xl font-bold">{dashboard.enrolledCourses}</h3>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">In Progress</p>
                    <h3 className="text-3xl font-bold">{dashboard.inProgressCourses}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
                    <h3 className="text-3xl font-bold">{dashboard.completedCourses}</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Certificates</p>
                    <h3 className="text-3xl font-bold">{dashboard.totalCertificates}</h3>
                  </div>
                  <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <Award className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Column - Courses & Activity */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Continue Learning */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-serif flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" /> Continue Learning
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/courses">Browse more</Link>
                </Button>
              </div>

              {isLoading ? (
                <LoadingState count={2} />
              ) : dashboard?.currentCourses && dashboard.currentCourses.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {dashboard.currentCourses.map((progress) => (
                    <Card key={progress.courseId} className="flex flex-col h-full hover-elevate overflow-hidden border-border/50">
                      <img
                        src={(progress as any).course?.thumbnailUrl || "/images/courses/default-course.jpg"}
                        alt={`${(progress as any).course?.title || `Course ${progress.courseId}`} course thumbnail`}
                        className="aspect-video w-full object-cover"
                        loading="lazy"
                      />
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold font-serif text-lg leading-tight line-clamp-2">
                            {(progress as any).course?.title || `Course ${progress.courseId}`}
                          </h3>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-4 mb-4">
                          <span className="flex items-center"><BookOpen className="w-4 h-4 mr-1"/> {progress.completedLessons}/{progress.totalLessons} lessons</span>
                        </div>
                        <div className="space-y-2 mt-auto">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Progress</span>
                            <span>{progress.progressPercent}%</span>
                          </div>
                          <Progress value={progress.progressPercent} className="h-2" />
                        </div>
                      </div>
                      <div className="px-5 pb-5 mt-auto pt-2">
                        <Button className="w-full" asChild>
                          <Link href={`/learn/${progress.courseId}`}>Resume Course</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={BookOpen}
                  title="No active courses"
                  description="You aren't enrolled in any courses yet. Start exploring to begin your learning journey."
                  actionLabel="Browse Courses"
                  actionHref="/courses"
                />
              )}
            </section>

            {/* Learning Activity Chart */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Learning Activity</CardTitle>
                  <CardDescription>Minutes spent learning per day over the last week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {isLoading ? (
                      <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
                    ) : dashboard?.weeklyProgress && dashboard.weeklyProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard.weeklyProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="minutes" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorMinutes)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
                        No activity data for this week
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" /> Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.upcomingDeadlines.map((item) => (
                      <div key={item.id} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded shrink-0 h-fit">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{item.courseTitle}</p>
                          <p className="text-xs font-medium text-destructive mt-1 flex items-center">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No upcoming deadlines! You're all caught up.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
                  <div className="relative border-l ml-3 pl-4 space-y-6">
                    {dashboard.recentActivity.map((activity, i) => (
                      <div key={activity.id} className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(activity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No recent activity to show.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
