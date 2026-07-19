import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  getGetCategoriesQueryKey
} from "@workspace/api-client-react/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories, isLoading } = useGetCategories();

  const createMutation = useCreateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "Category created" });
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  });

  const updateMutation = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "Category updated" });
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  });

  const deleteMutation = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "Category deleted" });
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Delete failed", 
          description: "Cannot delete category if it has active courses." 
        });
      }
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingId(null);
  };

  const handleEdit = (category: any) => {
    setName(category.name);
    setDescription(category.description || "");
    setEditingId(category.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate({ categoryId: editingId, data: { name, description } });
    } else {
      createMutation.mutate({ data: { name, description } });
    }
  };

  return (
    <AppLayout requiredRole="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">Categories</h1>
            <p className="text-muted-foreground">Manage the taxonomy of courses.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Category" : "Add New Category"}</DialogTitle>
                <DialogDescription>
                  Categories help students find relevant courses easily.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Web Development"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description (Optional)</Label>
                  <Textarea 
                    id="desc" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Brief description of this category..."
                    className="resize-none"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
                    {editingId ? "Update Category" : "Create Category"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1,2,3,4].map(i => <Card key={i}><CardContent className="h-32 p-6"><div className="animate-pulse bg-muted h-full rounded" /></CardContent></Card>)
          ) : categories && categories.length > 0 ? (
            categories.map((category) => (
              <Card key={category.id} className="hover-elevate transition-all border-border/50">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Layers className="w-5 h-5 text-primary" /> {category.name}
                    </CardTitle>
                    <div className="text-sm font-mono text-muted-foreground bg-muted inline-flex px-2 py-0.5 rounded">
                      /{category.slug}
                    </div>
                  </div>
                  <div className="flex -mr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if(confirm(`Delete "${category.name}"?`)) {
                          deleteMutation.mutate({ categoryId: category.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">
                    {category.description || "No description provided."}
                  </p>
                  <div className="flex items-center text-sm font-medium">
                    <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                    {category.courseCount || 0} Courses
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/10 text-muted-foreground">
              No categories defined.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
