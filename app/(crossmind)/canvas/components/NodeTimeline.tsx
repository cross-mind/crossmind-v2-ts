"use client";

/**
 * NodeTimeline Component
 *
 * Displays the activity and comments timeline for a node:
 * - Shows a unified timeline of activities and comments
 * - Provides comment input for adding new comments
 * - Supports @mentions in comments
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Activity,
  Clock,
  MessageSquare,
  CheckSquare,
  Send,
  FileText,
  Tag,
} from "lucide-react";

interface FeedActivity {
  id: string;
  type: "created" | "updated" | "status_changed" | "tag_added" | "comment_added";
  user: string;
  timestamp: string;
  description?: string;
  details?: string;
}

interface Comment {
  id: string;
  user: string;
  timestamp: string;
  content: string;
}

type TimelineItem = (FeedActivity | (Comment & { type: "comment" }));

export interface NodeTimelineProps {
  activities: FeedActivity[];
  comments: Comment[];
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
}

export function NodeTimeline({
  activities,
  comments,
  commentInput,
  onCommentInputChange,
  onAddComment,
}: NodeTimelineProps) {
  // Merge activities and comments into unified timeline
  const commentActivities = comments.map((comment) => ({
    ...comment,
    type: "comment" as const,
  }));

  const timeline: TimelineItem[] = [...activities, ...commentActivities].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <div className="mt-6 pt-6 border-t border-border/50">
      <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Activity className="h-3 w-3" />
        Activity & Comments
      </h4>
      <div className="space-y-3 mb-4">
        {timeline.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No activity yet
          </div>
        ) : (
          timeline.map((item) => {
            if (item.type === "comment") {
              // Render comment
              return (
                <div key={item.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 border border-border shrink-0 mt-0.5">
                    <AvatarFallback className="text-[10px]">
                      {item.user.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-xs font-medium">{item.user}</span>
                      <span className="text-[11px] text-muted-foreground/60">
                        commented {item.timestamp}
                      </span>
                    </div>
                    <div className="text-xs text-foreground/90 leading-relaxed wrap-break-word bg-muted/30 p-2 rounded">
                      {item.content.split(/(@\w+)/g).map((part, i) =>
                        part.startsWith("@") ? (
                          <span key={i} className="text-primary font-medium">
                            {part}
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              // Render activity
              return (
                <div key={item.id} className="flex gap-2 text-xs">
                  <div className="shrink-0 mt-0.5">
                    {item.type === "created" && (
                      <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Plus className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                    {item.type === "updated" && (
                      <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                    {item.type === "status_changed" && (
                      <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <CheckSquare className="h-3 w-3 text-purple-500" />
                      </div>
                    )}
                    {item.type === "tag_added" && (
                      <div className="h-5 w-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Tag className="h-3 w-3 text-orange-500" />
                      </div>
                    )}
                    {item.type === "comment_added" && (
                      <div className="h-5 w-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-cyan-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-medium text-foreground">
                        {item.user}
                      </span>
                      <span className="text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                    {item.details && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.details}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {item.timestamp}
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Comment Input */}
      <div className="relative">
        <Input
          value={commentInput}
          onChange={(e) => onCommentInputChange(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.shiftKey && onAddComment()
          }
          placeholder="Add a comment... (@ to mention)"
          className="pr-9 h-9 text-xs"
        />
        <Button
          size="icon"
          className="absolute right-1 top-1 h-7 w-7"
          variant="ghost"
          onClick={onAddComment}
          disabled={!commentInput.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
