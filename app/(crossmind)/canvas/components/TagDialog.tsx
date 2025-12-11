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
import { Loader2 } from "lucide-react";

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tag: string) => Promise<void>;
  existingTags?: string[];
}

export function TagDialog({
  open,
  onOpenChange,
  onSubmit,
  existingTags = [],
}: TagDialogProps) {
  const [namespace, setNamespace] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namespace.trim() || !value.trim()) return;

    const tag = `${namespace.trim()}/${value.trim()}`;

    // Check if tag already exists
    if (existingTags.includes(tag)) {
      alert("This tag already exists on this node");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(tag);
      // Reset form
      setNamespace("");
      setValue("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
          <DialogDescription>
            Add a tag to categorize this node. Format: namespace/value (e.g., priority/high, status/active)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="namespace">Namespace</Label>
              <Input
                id="namespace"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="e.g., priority, status, category"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g., high, active, feature"
                required
              />
            </div>
            {namespace && value && (
              <div className="text-xs text-muted-foreground">
                Preview: <span className="font-medium">{namespace}/{value}</span>
              </div>
            )}
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
            <Button type="submit" disabled={isSubmitting || !namespace.trim() || !value.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Tag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
