import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL || "").replace(/\/$/, "");

interface ModuleEditorDialogProps {
  courseId: number;
  module?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function ModuleEditorDialog({ courseId, module, onClose, onSaved }: ModuleEditorDialogProps) {
  const { toast } = useToast();
  const isEditing = !!module;

  const [title, setTitle] = useState(module?.title || "");
  const [description, setDescription] = useState(module?.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Module title is required", variant: "destructive" }); return; }
    setSaving(true);

    const token = localStorage.getItem("sf_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      if (isEditing) {
        const response = await fetch(`${API_BASE}/api/modules/${module.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ title: title.trim(), description: description || null }),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
      } else {
        const response = await fetch(`${API_BASE}/api/courses/${courseId}/modules`, {
          method: "POST",
          headers,
          body: JSON.stringify({ title: title.trim(), description: description || null }),
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
      }
      toast({ title: isEditing ? "Module updated!" : "Module created!" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Failed to save module", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Module" : "Add New Module"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="module-title">Module Title *</Label>
            <Input
              id="module-title"
              className="mt-1.5"
              placeholder="e.g. Getting Started with React"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="module-desc">Description (optional)</Label>
            <Textarea
              id="module-desc"
              className="mt-1.5 h-24 resize-none"
              placeholder="What will students learn in this module?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Update" : "Create Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getErrorMessage(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.message || data.error || "Server rejected the module";
}
