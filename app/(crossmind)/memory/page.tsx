"use client";

import { ArrowRight, Brain, Clock, FileText, Search, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MemoryEntry {
  id: string;
  content: string;
  category: "decision" | "constraint" | "goal" | "context";
  relatedDoc?: {
    id: string;
    title: string;
  };
  timestamp: string;
  tags: string[];
}

const MOCK_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-1",
    content:
      "Project aims to solve fragmentation in PM tools by providing an end-to-end solution from idea to deployment.",
    category: "goal",
    relatedDoc: { id: "doc-1", title: "Idea Brief" },
    timestamp: "2024-12-01T10:30:00",
    tags: ["vision", "product"],
  },
  {
    id: "mem-2",
    content:
      "MVP deadline is set for Q1 2026. Focus on core features: Idea Input, Doc Generation, Task Management.",
    category: "constraint",
    relatedDoc: { id: "doc-3", title: "PRD v1.0" },
    timestamp: "2024-12-02T14:20:00",
    tags: ["timeline", "mvp"],
  },
  {
    id: "mem-3",
    content:
      "Preferred tech stack: React + TypeScript for frontend, Python (FastAPI) for backend, PostgreSQL for database.",
    category: "decision",
    relatedDoc: { id: "doc-5", title: "API Schema" },
    timestamp: "2024-12-03T09:15:00",
    tags: ["tech", "architecture"],
  },
  {
    id: "mem-4",
    content:
      "Target users are indie developers and small teams (2-10 people) who need lightweight project management.",
    category: "context",
    relatedDoc: { id: "doc-1", title: "Idea Brief" },
    timestamp: "2024-12-01T16:45:00",
    tags: ["user", "market"],
  },
  {
    id: "mem-5",
    content:
      "AI Agent should be capable of understanding natural language requirements and generating structured documents.",
    category: "goal",
    relatedDoc: { id: "doc-4", title: "User Stories" },
    timestamp: "2024-12-04T11:00:00",
    tags: ["ai", "feature"],
  },
  {
    id: "mem-6",
    content:
      "Design philosophy: Minimalist, Linear-style UI with compact information density and efficient workflows.",
    category: "decision",
    timestamp: "2024-12-05T13:30:00",
    tags: ["design", "ux"],
  },
  {
    id: "mem-7",
    content: "Integrate GitHub OAuth for repository management and automated deployment pipelines.",
    category: "decision",
    relatedDoc: { id: "doc-6", title: "Setup Task" },
    timestamp: "2024-12-06T08:00:00",
    tags: ["integration", "github"],
  },
  {
    id: "mem-8",
    content:
      "Avoid feature bloat. Every feature must directly support the core workflow: Idea → Doc → Tasks → Code.",
    category: "constraint",
    timestamp: "2024-12-02T17:00:00",
    tags: ["scope", "product"],
  },
];

const CATEGORY_CONFIG = {
  decision: {
    label: "Decision",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Sparkles,
  },
  constraint: {
    label: "Constraint",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    icon: Clock,
  },
  goal: {
    label: "Goal",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: ArrowRight,
  },
  context: {
    label: "Context",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: FileText,
  },
};

export default function ProjectMemoryPage({
  onNavigateToChat,
}: {
  onNavigateToChat?: (docId?: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredMemories = MOCK_MEMORIES.filter((mem) => {
    const matchesSearch =
      mem.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || mem.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleMemoryClick = (memory: MemoryEntry) => {
    if (onNavigateToChat) {
      onNavigateToChat(memory.relatedDoc?.id);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Compact Header: Single Row */}
      <div className="flex items-center gap-4 px-4 py-3 border-b shrink-0 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <Brain className="h-4 w-4 text-muted-foreground shrink-0" />
          <h1 className="text-sm font-medium">Project Memory</h1>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">
            {filteredMemories.length} of {MOCK_MEMORIES.length}
          </span>
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 border-border/50 bg-background"
            />
          </div>

          <div className="flex gap-1">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className="h-8 px-3 gap-1.5"
              >
                <config.icon className="h-3.5 w-3.5" />
                <span className="text-xs">{config.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* List View */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No memories found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            filteredMemories.map((memory) => {
              return (
                <div
                  key={memory.id}
                  className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => handleMemoryClick(memory)}
                >
                  {/* Column 1: Category (Fixed Width) */}
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        CATEGORY_CONFIG[memory.category].color.split(" ")[0],
                      )}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {memory.category}
                    </span>
                  </div>

                  {/* Column 2: Content (Flexible) */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1 group-hover:line-clamp-none">
                      {memory.content}
                    </p>
                  </div>

                  {/* Column 3: Meta (Fixed Width) */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
                    {memory.relatedDoc && (
                      <>
                        <span className="group-hover:text-primary transition-colors">
                          {memory.relatedDoc.title}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    <span>
                      {new Date(memory.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
