import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetInstructorDashboard,
  getGetInstructorDashboardQueryKey
} from "@workspace/api-client-react/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { 
  BarChart as BarChartIcon, Users, DollarSign, Star, TrendingUp,
  PlusCircle, FileText, ArrowRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function InstructorDashboard() {
  const { data: dashboard, isLoading } = useGetInstructorDashboard({
    query: {
      queryKey: getGetInstructorDashboardQueryKey()
    }
  });

  return (
    <AppLayout requiredRole="instructor">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Monitor your courses, students, and revenue.</p>
          </div>
          <Button asChild>
            <Link href="/instructor/courses/new"><PlusCircle className="mr-2 w-4 h-4" /> Create Course</Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState count={4} />
        ) : dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-bold">${dashboard.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Students</p>
                    <h3 className="text-3xl font-bold">{dashboard.totalStudents.toLocaleString()}</h3>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Average Rating</p>
                    <h3 className="text-3xl font-bold">{dashboard.averageRating.toFixed(1)}</h3>
                  </div>
                  <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-500 fill-current" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Active Courses</p>
                    <h3 className="text-3xl font-bold">{dashboard.publishedCourses}/{dashboard.totalCourses}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Revenue Overview</CardTitle>
                <CardDescription>Your earnings over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
                  ) : dashboard?.revenueByMonth && dashboard.revenueByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboard.revenueByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                      No revenue data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-serif">Top Performing Courses</CardTitle>
                  <CardDescription>Based on revenue and enrollments</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/instructor/courses">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : dashboard?.topCourses && dashboard.topCourses.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.topCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <img
                            src={course.thumbnailUrl || "/images/courses/default-course.jpg"}
                            alt={`${course.title} course thumbnail`}
                            className="w-16 h-12 object-cover rounded-md"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{course.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {course.enrollmentCount}</span>
                              <span className="flex items-center"><Star className="w-3 h-3 mr-1 text-amber-500 fill-current"/> {course.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-right ml-4">
                          ${((course.enrollmentCount || 0) * course.price).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                   <div className="text-center py-6 text-muted-foreground">You haven't published any courses yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Recent Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                  </div>
                ) : dashboard?.recentEnrollments && dashboard.recentEnrollments.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.recentEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">New student enrolled</p>
                          <p className="text-xs text-muted-foreground truncate">{enrollment.course?.title}</p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">No recent enrollments.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
