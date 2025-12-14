"use client";

/**
 * CanvasDialogs Component
 *
 * Centralized container for all Canvas page dialogs.
 * Manages NodeDialog, TagDialog, and QuickNodeDialog.
 */

import React from "react";
import { NodeDialog } from "./NodeDialog";
import { TagDialog } from "./TagDialog";
import { QuickNodeDialog } from "./QuickNodeDialog";
import type { CanvasNode } from "../canvas-data";
import type { ZoneInfo } from "../hooks/useZoneDetection";

export interface CanvasDialogsProps {
  // NodeDialog state
  nodeDialogOpen: boolean;
  setNodeDialogOpen: (open: boolean) => void;
  nodeDialogParentId: string | null;
  onNodeCreate: (data: { title: string; content: string; type: "document" | "idea" | "task" | "inspiration" }) => Promise<void>;

  // TagDialog state
  tagDialogOpen: boolean;
  setTagDialogOpen: (open: boolean) => void;
  tagDialogNodeId: string | null;
  tagDialogExistingTags: string[];
  onTagSubmit: (tag: string) => Promise<void>;

  // QuickNodeDialog state
  quickNodeDialogOpen: boolean;
  setQuickNodeDialogOpen: (open: boolean) => void;
  quickNodeZone: ZoneInfo | null;
  onQuickNodeSubmit: (data: { title: string; type: "document" | "idea" | "task" | "inspiration" }) => void;
}

export function CanvasDialogs({
  nodeDialogOpen,
  setNodeDialogOpen,
  nodeDialogParentId,
  onNodeCreate,
  tagDialogOpen,
  setTagDialogOpen,
  tagDialogExistingTags,
  onTagSubmit,
  quickNodeDialogOpen,
  setQuickNodeDialogOpen,
  quickNodeZone,
  onQuickNodeSubmit,
}: CanvasDialogsProps) {
  return (
    <>
      {/* Node Creation Dialog */}
      <NodeDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        onSubmit={onNodeCreate}
        title={nodeDialogParentId ? "Add Child Node" : "Create New Node"}
        description={
          nodeDialogParentId
            ? "Create a child node under the selected parent."
            : "Create a new canvas node."
        }
      />

      {/* Tag Management Dialog */}
      <TagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        onSubmit={onTagSubmit}
        existingTags={tagDialogExistingTags}
      />

      {/* Quick Node Creation Dialog (Context Menu) */}
      <QuickNodeDialog
        open={quickNodeDialogOpen}
        onOpenChange={setQuickNodeDialogOpen}
        onSubmit={onQuickNodeSubmit}
        detectedZone={quickNodeZone}
      />
    </>
  );
}
