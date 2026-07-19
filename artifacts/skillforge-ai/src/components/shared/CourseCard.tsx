import React from "react";
import { Link } from "wouter";
import { Course } from "@workspace/api-client-react/api.schemas";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Clock, Users, PlayCircle } from "lucide-react";

interface CourseCardProps {
  course: Course;
  progressPercent?: number;
  showInstructor?: boolean;
}

export function CourseCard({ course, progressPercent, showInstructor = true }: CourseCardProps) {
  const isEnrolled = progressPercent !== undefined;

  return (
    <Link href={isEnrolled ? `/learn/${course.id}` : `/courses/${course.id}`}>
      <Card className="h-full overflow-hidden hover-elevate transition-all border-border/50 cursor-pointer flex flex-col group">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <img 
              src={course.thumbnailUrl} 
              alt={course.title} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <PlayCircle className="w-12 h-12 text-muted-foreground opacity-50" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm font-semibold border-none">
              {course.level}
            </Badge>
          </div>
          {course.discountPrice && course.discountPrice < course.price && !isEnrolled && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="destructive" className="font-bold shadow-md">
                Sale
              </Badge>
            </div>
          )}
        </div>
        
        <CardHeader className="p-4 pb-2 flex-grow">
          <div className="flex justify-between items-start mb-2 gap-4">
            <h3 className="font-serif font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
          </div>
          
          {showInstructor && course.instructorName && (
            <p className="text-sm text-muted-foreground mb-2">
              by <span className="font-medium text-foreground">{course.instructorName}</span>
            </p>
          )}

          {!isEnrolled && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2">
              {course.rating ? (
                <div className="flex items-center text-amber-500 font-medium">
                  <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                  {course.rating.toFixed(1)}
                  <span className="text-muted-foreground ml-1 font-normal">({course.reviewCount})</span>
                </div>
              ) : null}
              {course.totalDuration ? (
                <div className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {Math.round(course.totalDuration / 60)}h
                </div>
              ) : null}
              {course.enrollmentCount !== undefined && (
                <div className="flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  {course.enrollmentCount}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardFooter className="p-4 pt-0">
          {isEnrolled ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{progressPercent}% complete</span>
                {progressPercent === 100 && <span className="text-primary font-bold">Finished</span>}
              </div>
              <Progress value={progressPercent} className="h-2 w-full" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full font-bold">
              {course.price === 0 ? (
                <span className="text-primary">Free</span>
              ) : (
                <div className="flex items-center gap-2">
                  {course.discountPrice && course.discountPrice < course.price ? (
                    <>
                      <span>${course.discountPrice}</span>
                      <span className="text-muted-foreground text-sm line-through font-normal">${course.price}</span>
                    </>
                  ) : (
                    <span>${course.price}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
