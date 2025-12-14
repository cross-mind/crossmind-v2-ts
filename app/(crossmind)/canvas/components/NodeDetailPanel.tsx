"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Plus } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Chat } from "@/components/chat";
import { useChatSession } from "@/hooks/use-chat-session";
import type { CanvasNode } from "../canvas-data";
import { useCanvas } from "../core/CanvasContext";
import { NodeDetailHeader } from "./NodeDetailHeader";
import { NodeMetadata } from "./NodeMetadata";
import { NodeTimeline } from "./NodeTimeline";

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
  // Node to display (page-specific UI state)
  selectedNode: CanvasNode;

  // UI state (page-specific)
  showAIChat: boolean;
  commentInput: string;
  pendingAIChatPrompt?: { nodeId: string; prompt: string } | null;

  // Event handlers
  onClose: () => void;
  onSetShowAIChat: (show: boolean) => void;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onAddTag: (nodeId: string) => void;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  onClearPendingPrompt?: () => void;

  // Helper functions (page-specific logic)
  getFeedActivities: (nodeId: string) => FeedActivity[];
  getComments: (nodeId: string) => Comment[];
  processContentWithReferences: (content: string) => string;
  handleNodeReferenceClick: (nodeId: string) => void;
}

export function NodeDetailPanel({
  selectedNode,
  showAIChat,
  commentInput,
  pendingAIChatPrompt,
  onClose,
  onSetShowAIChat,
  onNodeClick,
  onAddTag,
  onCommentInputChange,
  onAddComment,
  onClearPendingPrompt,
  getFeedActivities,
  getComments,
  processContentWithReferences,
  handleNodeReferenceClick,
}: NodeDetailPanelProps) {
  // Access state from Context (but not selectedNode - that's page-specific)
  const { nodeTypeConfig, nodes, projectId } = useCanvas();

  const config = nodeTypeConfig[selectedNode.type];

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

  // Get activities and comments for timeline
  const activities = getFeedActivities(selectedNode.id);
  const comments = getComments(selectedNode.id);

  return (
    <div
      className="w-[600px] flex flex-col bg-background border-l border-border shadow-2xl shrink-0 animate-in slide-in-from-right duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <NodeDetailHeader
        selectedNode={selectedNode}
        nodeTypeConfig={config}
        showAIChat={showAIChat}
        onSetShowAIChat={onSetShowAIChat}
        onClose={onClose}
      />

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
            <NodeMetadata selectedNode={selectedNode} />

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
                {selectedNode.tags?.map((tag) => {
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
            <NodeTimeline
              activities={activities}
              comments={comments}
              commentInput={commentInput}
              onCommentInputChange={onCommentInputChange}
              onAddComment={onAddComment}
            />
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
                key={pendingAIChatPrompt?.prompt ? `${sessionId}-${pendingAIChatPrompt.nodeId}` : sessionId}
                id={sessionId}
                initialMessages={initialMessages}
                mode="panel"
                context={{
                  type: "canvas",
                  nodeId: selectedNode.id,
                  projectId: projectId || undefined,  // Convert null to undefined
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
                initialInput={pendingAIChatPrompt?.prompt}
                onInitialInputSent={onClearPendingPrompt}
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
