import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { Users, BookOpen, DollarSign, TrendingUp, Activity, PieChart as PieChartIcon } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() }
  });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Platform Overview</h1>
          <p className="text-muted-foreground">Global metrics and platform health.</p>
        </div>

        {isLoading ? (
          <LoadingState count={4} />
        ) : dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
                    <h3 className="text-3xl font-bold">{dashboard.totalUsers.toLocaleString()}</h3>
                    <p className="text-xs text-green-500 mt-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> +{dashboard.newUsersToday} today</p>
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Enrollments</p>
                    <h3 className="text-3xl font-bold">{dashboard.totalEnrollments.toLocaleString()}</h3>
                  </div>
                  <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Active Courses</p>
                    <h3 className="text-3xl font-bold">{dashboard.activeCourses}</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-serif">Platform Growth</CardTitle>
                <CardDescription>New users and enrollments over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  {isLoading ? (
                    <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
                  ) : dashboard?.platformGrowth && dashboard.platformGrowth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.platformGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                        <Line yAxisId="left" type="monotone" dataKey="users" name="New Users" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="enrollments" name="Enrollments" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                      No growth data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-serif">Category Breakdown</CardTitle>
                <CardDescription>Courses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex flex-col justify-center items-center">
                  {isLoading ? (
                    <div className="w-48 h-48 rounded-full bg-muted animate-pulse" />
                  ) : dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboard.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="courseCount"
                            nameKey="name"
                          >
                            {dashboard.categoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full grid grid-cols-2 gap-2 mt-4 text-sm">
                        {dashboard.categoryBreakdown.slice(0,4).map((cat, i) => (
                          <div key={i} className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="truncate" title={cat.name}>{cat.name} ({cat.courseCount})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">No categories defined</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
