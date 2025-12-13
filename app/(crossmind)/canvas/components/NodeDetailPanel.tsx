"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  X,
  FileText,
  Bot,
  Tag,
  Plus,
  Activity,
  Clock,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Send,
} from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Chat } from "@/components/chat";
import { useChatSession } from "@/hooks/use-chat-session";
import type { CanvasNode } from "../canvas-data";

interface NodeTypeConfig {
  emoji: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

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

interface NodeDetailPanelProps {
  selectedNode: CanvasNode;
  nodeTypeConfig: Record<string, NodeTypeConfig>;
  nodes: CanvasNode[];
  showAIChat: boolean;
  commentInput: string;
  projectId: string;  // Add projectId prop for Canvas AI chat
  onClose: () => void;
  onSetShowAIChat: (show: boolean) => void;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onAddTag: (nodeId: string) => void;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  getFeedActivities: (nodeId: string) => FeedActivity[];
  getComments: (nodeId: string) => Comment[];
  processContentWithReferences: (content: string) => string;
  handleNodeReferenceClick: (nodeId: string) => void;
}

export function NodeDetailPanel({
  selectedNode,
  nodeTypeConfig,
  nodes,
  showAIChat,
  commentInput,
  projectId,
  onClose,
  onSetShowAIChat,
  onNodeClick,
  onAddTag,
  onCommentInputChange,
  onAddComment,
  getFeedActivities,
  getComments,
  processContentWithReferences,
  handleNodeReferenceClick,
}: NodeDetailPanelProps) {
  const config = nodeTypeConfig[selectedNode.type];
  const Icon = config.icon;

  // Load chat session for this node (only when AI Chat tab is active)
  const { sessionId, initialMessages, isLoading } = useChatSession(
    showAIChat ? selectedNode.id : null
  );

  // Build breadcrumb path
  const buildBreadcrumb = (nodeId: string): CanvasNode[] => {
    const current = nodes.find((n) => n.id === nodeId);
    if (!current) return [];
    if (!current.parentId) return [current];
    return [...buildBreadcrumb(current.parentId), current];
  };

  const breadcrumbPath = buildBreadcrumb(selectedNode.id);
  const parentPath = breadcrumbPath.slice(0, -1);

  // Merge activities and comments into unified timeline
  const activities = getFeedActivities(selectedNode.id);
  const comments = getComments(selectedNode.id);

  const commentActivities = comments.map((comment) => ({
    id: comment.id,
    type: "comment" as const,
    user: comment.user,
    timestamp: comment.timestamp,
    content: comment.content,
  }));

  const timeline = [...activities, ...commentActivities].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <div
      className="w-[600px] flex flex-col bg-background border-l border-border shadow-2xl shrink-0 animate-in slide-in-from-right duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              config.color.replace("bg-", "bg-") + "/10"
            )}
          >
            <Icon
              className={cn("h-4 w-4", config.color.replace("bg-", "text-"))}
            />
          </div>
          <div>
            <h2 className="font-semibold text-sm">{selectedNode.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">
                {config.emoji} {config.label}
              </Badge>
              {selectedNode.tags.slice(0, 2).map((tag) => {
                const [, value] = tag.split("/");
                return (
                  <span key={tag} className="text-[10px] text-muted-foreground">
                    #{value}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={!showAIChat ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => onSetShowAIChat(false)}
            >
              <FileText className="h-3 w-3 mr-1" />
              Document
            </Button>
            <Button
              variant={showAIChat ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => onSetShowAIChat(true)}
            >
              <Bot className="h-3 w-3 mr-1" />
              AI Chat
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!showAIChat ? (
          /* Document Content */
          <div className="flex-1 p-6 overflow-y-auto border-r border-border/40 bg-card/30">
            {/* Breadcrumb for child nodes */}
            {selectedNode.parentId && parentPath.length > 0 && (
              <div className="mb-4 pb-4 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                  {parentPath.map((ancestor, index) => (
                    <React.Fragment key={ancestor.id}>
                      <button
                        className="hover:text-foreground transition-colors truncate max-w-[150px]"
                        onClick={() => {
                          const ancestorNode = nodes.find((n) => n.id === ancestor.id);
                          if (ancestorNode)
                            onNodeClick(ancestorNode, {} as React.MouseEvent);
                        }}
                      >
                        {ancestor.title}
                      </button>
                      {index < parentPath.length - 1 && (
                        <span className="text-muted-foreground/50">/</span>
                      )}
                    </React.Fragment>
                  ))}
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-foreground font-medium truncate max-w-[150px]">
                    {selectedNode.title}
                  </span>
                </div>
              </div>
            )}

            {/* Type-specific metadata */}
            {selectedNode.type === "task" && (
              <div className="mb-6 p-4 bg-background/60 border border-border/50 rounded-lg space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">
                  Task Info
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        selectedNode.taskStatus === "done" ? "default" : "secondary"
                      }
                    >
                      {selectedNode.taskStatus === "done" && "Done"}
                      {selectedNode.taskStatus === "in-progress" && "In Progress"}
                      {selectedNode.taskStatus === "todo" && "To Do"}
                    </Badge>
                  </div>
                  {selectedNode.assignee && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assignee</span>
                      <span>{selectedNode.assignee}</span>
                    </div>
                  )}
                  {selectedNode.dueDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span>{selectedNode.dueDate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedNode.type === "idea" && (
              <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-500 mb-2">
                  💡 Early-stage Idea
                </h4>
                <p className="text-xs text-muted-foreground">
                  This is an unvalidated creative idea that can be refined with AI
                  assistance or converted to a formal document for in-depth design.
                </p>
              </div>
            )}

            {selectedNode.type === "inspiration" && (
              <div className="mb-6 p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg">
                <h4 className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inspiration Captured
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedNode.source && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="text-pink-600 dark:text-pink-400">
                        {selectedNode.source}
                      </span>
                    </div>
                  )}
                  {selectedNode.capturedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Captured At</span>
                      <span>{selectedNode.capturedAt}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3 p-2 bg-background/50 rounded border border-pink-500/10">
                  💡 Tip: This inspiration can be transformed into a document or used as
                  a reference for ideas
                </p>
              </div>
            )}

            {/* Document Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-pre:bg-muted prose-pre:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, href, children, ...props }) => {
                    // Handle node reference links [[node-id]]
                    if (href?.startsWith("#")) {
                      const nodeId = href.slice(1);
                      return (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleNodeReferenceClick(nodeId);
                          }}
                          className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    }
                    return (
                      <a href={href} {...props}>
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {processContentWithReferences(selectedNode.content)}
              </ReactMarkdown>
            </div>

            {/* Tags Section */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedNode.tags.map((tag) => {
                  const [namespace, value] = tag.split("/");
                  return (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {namespace}/{value}
                    </Badge>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => onAddTag(selectedNode.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Tag
                </Button>
              </div>
            </div>

            {/* Activity & Comments Timeline */}
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
          </div>
        ) : (
          /* AI Chat Interface */
          <div className="flex-1 flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Loading chat session...
              </div>
            ) : sessionId ? (
              <Chat
                id={sessionId}
                initialMessages={initialMessages}
                mode="panel"
                context={{
                  type: "canvas",
                  nodeId: selectedNode.id,
                  projectId: projectId,  // Use projectId prop instead of selectedNode.projectId
                }}
                apiEndpoint="/api/canvas/chat"
                features={{
                  showHeader: false,
                  showArtifact: false,
                  allowAttachments: true,
                  allowModelSwitch: false,
                  compactInput: true,
                }}
                isReadonly={false}
                autoResume={false}
                initialChatModel="chat-model"
                initialVisibilityType="private"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Failed to load chat session
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
