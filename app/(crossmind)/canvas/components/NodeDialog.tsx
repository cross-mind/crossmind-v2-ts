"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface NodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    content: string;
    type: "document" | "idea" | "task" | "inspiration";
  }) => Promise<void>;
  title: string;
  description?: string;
  defaultValues?: {
    title?: string;
    content?: string;
    type?: "document" | "idea" | "task" | "inspiration";
  };
}

export function NodeDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  defaultValues = {},
}: NodeDialogProps) {
  const [nodeTitle, setNodeTitle] = useState(defaultValues.title || "");
  const [content, setContent] = useState(defaultValues.content || "");
  const [type, setType] = useState<"document" | "idea" | "task" | "inspiration">(
    defaultValues.type || "document"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ title: nodeTitle, content, type });
      // Reset form
      setNodeTitle("");
      setContent("");
      setType("document");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">📄 Document</SelectItem>
                  <SelectItem value="idea">💡 Idea</SelectItem>
                  <SelectItem value="task">☑️ Task</SelectItem>
                  <SelectItem value="inspiration">✨ Inspiration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                placeholder="Enter node title..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content (markdown supported)..."
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !nodeTitle.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
