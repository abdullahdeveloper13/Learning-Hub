import React, { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetCourses, 
  useDeleteCourse, 
  usePublishCourse, 
  getGetCoursesQueryKey 
} from "@workspace/api-client-react/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, Eye, MoreVertical, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminCourses() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetCourses({ search: search || undefined });

  const deleteMutation = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course deleted by admin" });
        queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
      }
    }
  });

  const publishMutation = usePublishCourse({
    mutation: {
      onSuccess: (course) => {
        toast({ title: `Course ${course.isPublished ? 'published' : 'unpublished'} by admin` });
        queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey() });
      }
    }
  });

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Manage Courses</h1>
          <p className="text-muted-foreground">Administer all courses across the platform.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search courses by title..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : data?.courses && data.courses.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium">Course Title</th>
                        <th className="px-6 py-3 font-medium">Instructor</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Enrollments</th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.courses.map((course) => (
                        <tr key={course.id} className="bg-card hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground max-w-[300px] truncate" title={course.title}>
                              {course.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {course.categoryName} • {course.level}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {course.instructorName}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={course.isPublished ? "default" : "secondary"} className={course.isPublished ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" : ""}>
                              {course.isPublished ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {course.enrollmentCount || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/courses/${course.id}`} className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" /> View Course
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => publishMutation.mutate({ courseId: course.id, data: { isPublished: !course.isPublished } })}
                                  className="cursor-pointer"
                                >
                                  {course.isPublished ? <ShieldAlert className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                  {course.isPublished ? "Force Unpublish" : "Force Publish"}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                  onClick={() => {
                                    if(confirm(`Are you sure you want to permanently delete "${course.title}"?`)) {
                                      deleteMutation.mutate({ courseId: course.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete Course
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No courses found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
