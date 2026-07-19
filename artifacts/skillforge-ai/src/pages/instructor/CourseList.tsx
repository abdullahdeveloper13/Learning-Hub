import React from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetCourses, useDeleteCourse, usePublishCourse, getGetCoursesQueryKey } from "@workspace/api-client-react/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  PlusCircle, Edit, Trash2, Eye, MoreVertical, 
  BarChart, BookOpen, Users, DollarSign 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InstructorCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetCourses({
    instructorId: user?.id,
  }, {
    query: {
      enabled: !!user?.id,
      queryKey: getGetCoursesQueryKey({ instructorId: user?.id })
    }
  });

  const deleteMutation = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey({ instructorId: user?.id }) });
      }
    }
  });

  const publishMutation = usePublishCourse({
    mutation: {
      onSuccess: (course) => {
        toast({ title: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully` });
        queryClient.invalidateQueries({ queryKey: getGetCoursesQueryKey({ instructorId: user?.id }) });
      }
    }
  });

  const courses = data?.courses || [];

  return (
    <AppLayout requiredRole="instructor">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">My Courses</h1>
            <p className="text-muted-foreground">Manage your curriculum, track performance, and create new content.</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/instructor/courses/new"><PlusCircle className="mr-2 w-4 h-4" /> Create Course</Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingState count={3} />
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="overflow-hidden flex flex-col md:flex-row group border-border hover:border-primary/50 transition-colors">
                <div className="w-full md:w-64 h-48 md:h-auto bg-muted relative shrink-0">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge variant={course.isPublished ? "default" : "secondary"} className="shadow-sm">
                      {course.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-xl font-bold font-serif line-clamp-1">{course.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mt-2"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/courses/${course.id}`} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View Public Page
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/instructor/courses/${course.id}/edit`} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit Course
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => publishMutation.mutate({ courseId: course.id, data: { isPublished: !course.isPublished } })}
                          className="cursor-pointer"
                        >
                          {course.isPublished ? "Unpublish" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this course? This cannot be undone.")) {
                              deleteMutation.mutate({ courseId: course.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-6 max-w-2xl">
                    {course.shortDescription || course.description || "No description provided."}
                  </p>
                  
                  <div className="mt-auto flex flex-wrap items-center gap-6 pt-4 border-t">
                    <div className="flex items-center text-sm font-medium">
                      <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                      {course.price === 0 ? "Free" : `$${course.price}`}
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                      {course.enrollmentCount || 0} Students
                    </div>
                    <div className="flex items-center text-sm">
                      <BookOpen className="w-4 h-4 mr-1 text-muted-foreground" />
                      {course.totalLessons || 0} Lessons
                    </div>
                    
                    <div className="ml-auto flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                        <Link href={`/instructor/courses/${course.id}/analytics`}>
                          <BarChart className="w-4 h-4 mr-2" /> Analytics
                        </Link>
                      </Button>
                      <Button size="sm" asChild className="flex-1 sm:flex-none">
                        <Link href={`/instructor/courses/${course.id}/edit`}>
                          Manage Course
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={BookOpen}
            title="No courses yet"
            description="You haven't created any courses. Start sharing your knowledge by building your first course."
            actionLabel="Create Course"
            actionHref="/instructor/courses/new"
          />
        )}
      </div>
    </AppLayout>
  );
}
