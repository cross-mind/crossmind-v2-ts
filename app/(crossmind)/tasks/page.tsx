"use client";

import {
  Bot,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock,
  Edit2,
  FileText,
  Layout,
  MessageSquare,
  Plus,
  Send,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  tag: "Dev" | "Design" | "Marketing";
  assignee?: string;
  priority: "High" | "Medium" | "Low";
  dueDate?: string;
  status: "Todo" | "In Progress" | "Done";
  relatedDocId?: string;
}

interface Comment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
}

interface Activity {
  id: string;
  type: "status_change" | "field_change" | "comment" | "agent_update";
  actor: string;
  action: string;
  timestamp: string;
  details?: string;
}

const COLUMN_TASKS: Record<string, Task[]> = {
  Todo: [
    {
      id: "1",
      title: "Setup React project with Vite",
      tag: "Dev",
      assignee: "JD",
      priority: "High",
      status: "Todo",
      description:
        "Initialize a new React project using Vite with TypeScript support. Configure ESLint and Prettier.",
    },
    {
      id: "2",
      title: "Design Logo and Brand Assets",
      tag: "Design",
      priority: "Medium",
      status: "Todo",
      description: "Create logo variations and brand color palette.",
    },
  ],
  "In Progress": [
    {
      id: "3",
      title: "Draft PRD v1.0",
      tag: "Marketing",
      assignee: "ME",
      priority: "High",
      status: "In Progress",
      description: "Write comprehensive product requirements document covering all MVP features.",
      relatedDocId: "doc-3",
    },
  ],
  Done: [
    {
      id: "4",
      title: "Initial Idea Brainstorming",
      tag: "Marketing",
      assignee: "ME",
      priority: "Low",
      status: "Done",
      description: "Conduct initial brainstorming session and document key ideas.",
      relatedDocId: "doc-1",
    },
  ],
};

const MOCK_COMMENTS: Record<string, Comment[]> = {
  "1": [
    {
      id: "c1",
      author: "JD",
      content: "Should we use Vite or Next.js for this project?",
      timestamp: "2024-12-06T10:30:00",
    },
    {
      id: "c2",
      author: "AI Assistant",
      content:
        "Based on the project requirements, Vite is recommended for faster development and simpler setup.",
      timestamp: "2024-12-06T10:32:00",
      isAI: true,
    },
  ],
  "3": [
    {
      id: "c3",
      author: "ME",
      content: "First draft is ready for review. @JD please take a look.",
      timestamp: "2024-12-06T14:20:00",
    },
  ],
};

const MOCK_ACTIVITIES: Record<string, Activity[]> = {
  "1": [
    {
      id: "a1",
      type: "status_change",
      actor: "JD",
      action: "moved task to",
      details: "Todo",
      timestamp: "2024-12-06T09:00:00",
    },
    {
      id: "a2",
      type: "field_change",
      actor: "JD",
      action: "assigned to",
      details: "JD",
      timestamp: "2024-12-06T09:01:00",
    },
    {
      id: "a3",
      type: "field_change",
      actor: "JD",
      action: "set priority to",
      details: "High",
      timestamp: "2024-12-06T09:02:00",
    },
  ],
  "3": [
    {
      id: "a4",
      type: "status_change",
      actor: "ME",
      action: "moved task to",
      details: "In Progress",
      timestamp: "2024-12-06T10:00:00",
    },
    {
      id: "a5",
      type: "comment",
      actor: "ME",
      action: "commented",
      timestamp: "2024-12-06T14:20:00",
    },
  ],
  "4": [
    {
      id: "a6",
      type: "status_change",
      actor: "ME",
      action: "moved task to",
      details: "Done",
      timestamp: "2024-12-05T16:00:00",
    },
    {
      id: "a7",
      type: "agent_update",
      actor: "AI Assistant",
      action: "updated task",
      details: "Added related document link",
      timestamp: "2024-12-05T16:05:00",
    },
  ],
};

const TAG_COLORS = {
  Dev: "bg-blue-500",
  Design: "bg-pink-500",
  Marketing: "bg-orange-500",
};

const PRIORITY_COLORS = {
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
};

const STATUS_ICONS = {
  Todo: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  "In Progress": <CircleDashed className="h-3.5 w-3.5 text-yellow-600" />,
  Done: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
};

export default function TaskBoardPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  const totalTasks = Object.values(COLUMN_TASKS).flat().length;

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditedTask({ ...task });
    setIsEditing(false);
    setCommentInput("");
  };

  const handleClosePanel = () => {
    setSelectedTask(null);
    setIsEditing(false);
  };

  const handleSaveTask = () => {
    if (editedTask) {
      setSelectedTask(editedTask);
      setIsEditing(false);
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !selectedTask) return;
    setCommentInput("");
  };

  const getTaskComments = (taskId: string) => {
    return MOCK_COMMENTS[taskId] || [];
  };

  const getTaskActivities = (taskId: string) => {
    return MOCK_ACTIVITIES[taskId] || [];
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Single-line Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 h-14">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <Layout className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-medium">MVP Launch Plan</h1>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{totalTasks} tasks</span>
        </div>
        <Button size="sm" className="h-8 gap-2">
          <Plus className="h-3.5 w-3.5" />
          New Task
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-0 overflow-x-auto overflow-y-hidden relative">
        {Object.entries(COLUMN_TASKS).map(([column, tasks]) => (
          <div key={column} className="flex flex-col w-80 shrink-0 border-r last:border-r-0">
            {/* Column Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              {STATUS_ICONS[column as keyof typeof STATUS_ICONS]}
              <span className="text-xs font-medium">{column}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{tasks.length}</span>
            </div>

            {/* Tasks List */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group p-3 border rounded-lg hover:bg-muted/40 cursor-pointer transition-colors",
                      selectedTask?.id === task.id && "border-primary bg-primary/5",
                    )}
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[task.priority]} mt-1 shrink-0`}
                      />
                      <p className="text-sm text-foreground flex-1 leading-snug">{task.title}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${TAG_COLORS[task.tag]}`} />
                        <span>{task.tag}</span>
                      </div>
                      {task.assignee && (
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">{task.assignee}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                ))}

                <button className="w-full p-2 text-xs text-muted-foreground/60 hover:text-foreground border border-dashed rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add task
                </button>
              </div>
            </ScrollArea>
          </div>
        ))}

        {/* Task Detail Panel */}
        {selectedTask && (
          <div
            className="absolute top-0 right-0 h-full w-full md:w-[600px] lg:w-[800px] bg-background border-l border-border shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
              <div className="flex items-center gap-3">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[selectedTask.priority]}`}
                />
                <div>
                  <h2 className="font-semibold text-sm">{selectedTask.title}</h2>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedTask.tag} • {selectedTask.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleSaveTask} className="h-8">
                    Save
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={handleClosePanel} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Title</Label>
                    {isEditing ? (
                      <Input
                        value={editedTask?.title || ""}
                        onChange={(e) =>
                          setEditedTask((prev) =>
                            prev ? { ...prev, title: e.target.value } : null,
                          )
                        }
                        className="h-9 text-sm"
                      />
                    ) : (
                      <p className="text-sm text-foreground">{selectedTask.title}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Description</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedTask?.description || ""}
                        onChange={(e) =>
                          setEditedTask((prev) =>
                            prev ? { ...prev, description: e.target.value } : null,
                          )
                        }
                        className="text-sm min-h-[80px]"
                        placeholder="Add task description..."
                      />
                    ) : (
                      <p className="text-sm text-foreground text-muted-foreground">
                        {selectedTask.description || "No description"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Priority</Label>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[selectedTask.priority]}`}
                        />
                        <span className="text-sm text-foreground capitalize">
                          {selectedTask.priority}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Assignee</Label>
                      <div className="flex items-center gap-2">
                        {selectedTask.assignee ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {selectedTask.assignee}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">{selectedTask.assignee}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTask.relatedDocId && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Related Document</Label>
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Document</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Activity
                  </h3>
                  <div className="space-y-3">
                    {getTaskActivities(selectedTask.id).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{activity.actor}</span>
                            <span className="text-muted-foreground">{activity.action}</span>
                            {activity.details && (
                              <span className="text-muted-foreground/60">{activity.details}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground/60">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comments
                  </h3>
                  <div className="space-y-3 mb-4">
                    {getTaskComments(selectedTask.id).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-6 w-6 border border-border shrink-0">
                          {comment.isAI ? (
                            <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-3 w-3 text-primary" />
                            </div>
                          ) : (
                            <AvatarFallback className="text-[10px]">
                              {comment.author.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {comment.author}
                            </span>
                            {comment.isAI && (
                              <span className="text-[10px] text-muted-foreground/60">AI</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                      placeholder="Add a comment..."
                      className="h-9 text-xs flex-1"
                    />
                    <Button size="icon" onClick={handleAddComment} className="h-9 w-9">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
