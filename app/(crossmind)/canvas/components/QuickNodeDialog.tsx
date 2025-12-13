/**
 * QuickNodeDialog Component
 * Simplified dialog for quick node creation with type selector and title input
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NODE_TYPE_CONFIG, type NodeType } from "../node-type-config";
import type { ZoneInfo } from "../hooks/useZoneDetection";

interface QuickNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; type: NodeType }) => void;
  detectedZone: ZoneInfo | null;
}

export function QuickNodeDialog({ open, onOpenChange, onSubmit, detectedZone }: QuickNodeDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<NodeType>("idea");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is mounted
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({ title: title.trim(), type });

    // Reset form
    setTitle("");
    setType("idea");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCancel = () => {
    setTitle("");
    setType("idea");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Create Node</DialogTitle>
        </DialogHeader>

        {/* Zone display */}
        <div className="text-xs text-muted-foreground">
          Zone: {detectedZone?.name || "Unassigned"}
        </div>

        {/* Type selector + Title input */}
        <div className="flex items-center gap-2">
          {/* Type Icon Dropdown */}
          <Select value={type} onValueChange={(value) => setType(value as NodeType)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">
                <span className="flex items-center gap-2">
                  {NODE_TYPE_CONFIG.idea.emoji} Idea
                </span>
              </SelectItem>
              <SelectItem value="document">
                <span className="flex items-center gap-2">
                  {NODE_TYPE_CONFIG.document.emoji} Doc
                </span>
              </SelectItem>
              <SelectItem value="task">
                <span className="flex items-center gap-2">
                  {NODE_TYPE_CONFIG.task.emoji} Task
                </span>
              </SelectItem>
              <SelectItem value="inspiration">
                <span className="flex items-center gap-2">
                  {NODE_TYPE_CONFIG.inspiration.emoji} Spark
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Title Input */}
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title..."
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} size="sm">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
