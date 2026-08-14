import React, { useState } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CourseCard } from "@/components/shared/CourseCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { usePublicCategories, usePublicCourses } from "@/hooks/use-public-catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CourseList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("popular");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoryList = [] } = usePublicCategories();
  const { data: courseList = [], isLoading, isError } = usePublicCourses({
    search: debouncedSearch || undefined,
    categoryId,
    level,
    sortBy,
    published: true,
    limit: 20
  });

  return (
    <PublicLayout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-4">Browse Courses</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Discover thousands of courses from experts. Master new skills with AI-powered learning.
          </p>
          
          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="What do you want to learn?" 
                className="pl-10 h-12 text-base bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full md:w-64 space-y-8 shrink-0">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2">
                <Filter className="w-4 h-4" /> Filters
              </h3>
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Category</h4>
                <div className="space-y-2">
                  <div 
                    className={`text-sm cursor-pointer hover:text-primary ${!categoryId ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setCategoryId(undefined)}
                  >
                    All Categories
                  </div>
                  {categoryList.map(cat => (
                    <div 
                      key={cat.id}
                      className={`text-sm cursor-pointer hover:text-primary ${categoryId === cat.id ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setCategoryId(cat.id)}
                    >
                      {cat.name} <span className="text-xs opacity-50 ml-1">({cat.courseCount})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-sm">Level</h4>
                <div className="space-y-2">
                  {['beginner', 'intermediate', 'advanced'].map(l => (
                    <div 
                      key={l}
                      className="flex items-center gap-2"
                    >
                      <input 
                        type="radio" 
                        id={`level-${l}`} 
                        name="level" 
                        checked={level === l}
                        onChange={() => setLevel(l)}
                        className="rounded-full"
                      />
                      <label htmlFor={`level-${l}`} className="text-sm capitalize cursor-pointer">
                        {l}
                      </label>
                    </div>
                  ))}
                  {level && (
                    <div 
                      className="text-xs text-primary cursor-pointer mt-2" 
                      onClick={() => setLevel(undefined)}
                    >
                      Clear level filter
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-bold text-foreground">{courseList.length}</span> courses
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters display */}
            {(categoryId || level) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {categoryId && categoryList.find(c => c.id === categoryId) && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Category: {categoryList.find(c => c.id === categoryId)?.name}
                    <button className="ml-2 hover:text-destructive" onClick={() => setCategoryId(undefined)}>×</button>
                  </Badge>
                )}
                {level && (
                  <Badge variant="secondary" className="px-3 py-1 capitalize">
                    Level: {level}
                    <button className="ml-2 hover:text-destructive" onClick={() => setLevel(undefined)}>×</button>
                  </Badge>
                )}
              </div>
            )}

            {isLoading ? (
              <LoadingState count={6} />
            ) : courseList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseList.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : isError ? (
              <div className="py-20 text-center border rounded-2xl bg-card border-dashed">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Courses could not be loaded</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Refresh the page or check that the API server is running.
                </p>
                <Button onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="py-20 text-center border rounded-2xl bg-card border-dashed">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  We couldn't find any courses matching your current filters. Try adjusting your search or clearing filters.
                </p>
                <Button 
                  onClick={() => {
                    setSearch("");
                    setCategoryId(undefined);
                    setLevel(undefined);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
}
