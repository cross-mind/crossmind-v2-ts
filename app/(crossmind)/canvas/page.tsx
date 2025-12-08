"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Send, Bot, FileText, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface DocumentNode {
  id: string;
  title: string;
  type: "idea" | "prd" | "design" | "code";
  status: "completed" | "in-progress" | "pending";
  content: string;
  scores: {
    clarity: number;       // 清晰度 0-100
    completeness: number;  // 完整性 0-100
    feasibility: number;   // 可行性 0-100
    alignment: number;     // 对齐度 0-100
  };
}

interface Stage {
  id: string;
  title: string;
  nodes: DocumentNode[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Mock Data - Business & Product Focus
const PROJECT_STAGES: Stage[] = [
  {
    id: "stage-1",
    title: "Market & Opportunity",
    nodes: [
      {
        id: "doc-1",
        title: "Market Analysis",
        type: "idea",
        status: "completed",
        content: "# Market Analysis\n\n## Market Size\n- TAM: $50B globally\n- SAM: $8B in target regions\n- SOM: $200M achievable in 3 years\n\n## Key Trends\n- Remote work adoption: +300% since 2020\n- AI automation demand growing 40% YoY\n- SMB software spending up 25%\n\n## Opportunity\nFragmented tools costing teams 2hrs/day in context switching.",
        scores: { clarity: 100, completeness: 100, feasibility: 100, alignment: 100 }
      },
      {
        id: "doc-2",
        title: "Business Model Canvas",
        type: "idea",
        status: "completed",
        content: "# Business Model Canvas\n\n## Value Proposition\nAll-in-one platform: Idea → Doc → Task → Code\n\n## Customer Segments\n- Indie developers (1-2 people)\n- Small teams (3-10 people)\n- Startup founders\n\n## Revenue Streams\n- Freemium: Free for individuals\n- Pro: $15/user/month\n- Team: $12/user/month (5+ seats)\n\n## Key Metrics\n- MRR growth\n- User activation rate\n- Time-to-first-value",
        scores: { clarity: 95, completeness: 90, feasibility: 85, alignment: 100 }
      },
    ]
  },
  {
    id: "stage-2",
    title: "Product Vision",
    nodes: [
      {
        id: "doc-3",
        title: "Product Brief",
        type: "prd",
        status: "in-progress",
        content: "# Product Brief: CrossMind\n\n## Vision\nA unified workspace where ideas transform into shipped products, powered by AI.\n\n## Problem\nTeams waste 40% of time switching between 8+ tools:\n- Notion (docs)\n- Linear (tasks)\n- GitHub (code)\n- Slack (chat)\n- Figma (design)\n\nContext is lost. Progress is invisible.\n\n## Solution\nOne platform, four phases:\n1. Ideate: Capture & refine with AI\n2. Document: Auto-generate PRDs\n3. Execute: Visual task boards\n4. Ship: Integrated dev tools\n\n## Success Metrics\n- 50% reduction in tool switching\n- 2x faster from idea to first release\n- 90%+ user satisfaction",
        scores: { clarity: 85, completeness: 70, feasibility: 75, alignment: 90 }
      },
      {
        id: "doc-4",
        title: "User Personas",
        type: "prd",
        status: "completed",
        content: "# User Personas\n\n## Persona 1: Indie Hacker Sarah\n- Age: 28, Solo developer\n- Goal: Ship side projects faster\n- Pain: Too many tools, limited budget\n- Needs: Simple, affordable, AI-assisted\n\n## Persona 2: Startup CTO Alex\n- Age: 35, Managing 5-person team\n- Goal: Align team on product vision\n- Pain: Context scattered across tools\n- Needs: Collaboration, visibility, integrations\n\n## Persona 3: Product Manager Chen\n- Age: 32, PM at small company\n- Goal: Clear requirements → execution\n- Pain: Misalignment between design & dev\n- Needs: Source of truth, version control",
        scores: { clarity: 100, completeness: 100, feasibility: 100, alignment: 100 }
      },
    ]
  },
  {
    id: "stage-3",
    title: "User Experience",
    nodes: [
      {
        id: "doc-5",
        title: "User Flows",
        type: "design",
        status: "in-progress",
        content: "# Core User Flows\n\n## Flow 1: Idea to Doc (New User)\n1. Land on homepage → See value prop\n2. Click 'Start Free' → Sign up (email/Google)\n3. Onboarding: 'What are you building?'\n4. AI suggests structure → User refines\n5. Generate product brief → Preview & edit\n6. Save → Dashboard\n\n## Flow 2: Doc to Tasks\n1. Open product brief\n2. Click 'Create Tasks'\n3. AI extracts features → Suggests breakdown\n4. User reviews → Accepts/edits\n5. Tasks appear in Kanban board\n6. Assign → Set priority → Start work\n\n## Flow 3: Collaborative Review\n1. Share doc link → Teammate opens\n2. Inline comments → AI summarizes feedback\n3. Owner reviews → Accepts changes\n4. Update reflected in tasks automatically",
        scores: { clarity: 80, completeness: 65, feasibility: 90, alignment: 85 }
      },
      {
        id: "doc-6",
        title: "Design Principles",
        type: "design",
        status: "pending",
        content: "# Design Principles\n\n## 1. Minimal Dense Layout (MDL)\n- Structure > Decoration\n- Table-like lists, not cards\n- Hover to expand, not click to modal\n\n## 2. Progressive Disclosure\n- Show essentials first\n- Details on hover/click\n- No overwhelming forms\n\n## 3. AI as Co-pilot\n- Suggest, don't dictate\n- Always editable\n- Transparent reasoning\n\n## 4. Speed Obsession\n- <100ms UI responses\n- Optimistic updates\n- Keyboard shortcuts everywhere\n\n## 5. Trust Through Clarity\n- Clear data ownership\n- Version history visible\n- Export anytime",
        scores: { clarity: 60, completeness: 50, feasibility: 70, alignment: 80 }
      },
    ]
  },
  {
    id: "stage-4",
    title: "Go-to-Market",
    nodes: [
      {
        id: "doc-7",
        title: "Launch Strategy",
        type: "idea",
        status: "pending",
        content: "# Launch Strategy\n\n## Phase 1: Private Beta (Week 1-4)\n- 50 hand-picked users\n- Daily feedback loops\n- Iterate on onboarding\n\n## Phase 2: Public Beta (Week 5-8)\n- Product Hunt launch\n- Indie Hackers post\n- Twitter threads\n- Target: 500 signups\n\n## Phase 3: V1 Launch (Week 9-12)\n- Major feature complete\n- Case studies ready\n- Pricing finalized\n- Press outreach\n\n## Success Criteria\n- 1000 signups in Month 1\n- 20% activation rate\n- 5+ testimonials\n- $5K MRR by Month 3",
        scores: { clarity: 75, completeness: 60, feasibility: 80, alignment: 90 }
      },
    ]
  }
];

export default function CanvasPage() {
  const initialDocId = undefined;
  const [selectedDoc, setSelectedDoc] = useState<DocumentNode | null>(() => {
    // If initialDocId is provided, find and open that document
    if (initialDocId) {
      const allDocs = PROJECT_STAGES.flatMap(s => s.nodes);
      return allDocs.find(doc => doc.id === initialDocId) || null;
    }
    return null;
  });
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ [key: string]: ChatMessage[] }>({}); // Chat history per doc

  // Canvas drag state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  const handleDocClick = (doc: DocumentNode) => {
    setSelectedDoc(doc);
  };

  const handleClosePanel = () => {
    setSelectedDoc(null);
  };

  const getMessages = (docId: string) => {
    return chatHistory[docId] || [
      {
        id: "system-1",
        role: "assistant",
        content: `I'm ready to discuss "${PROJECT_STAGES.flatMap(s => s.nodes).find(n => n.id === docId)?.title}". What would you like to know or change?`
      }
    ];
  };

  const handleSend = () => {
    if (!input.trim() || !selectedDoc) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setChatHistory(prev => ({
      ...prev,
      [selectedDoc.id]: [...(prev[selectedDoc.id] || getMessages(selectedDoc.id)), newMessage]
    }));

    setInput("");
    setIsThinking(true);

    // Simulate AI Response
    setTimeout(() => {
      setIsThinking(false);
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've noted your feedback on ${selectedDoc.title}. " ${input} ". Updating the context...`
      };
      setChatHistory(prev => ({
        ...prev,
        [selectedDoc.id]: [...prev[selectedDoc.id], aiResponse]
      }));
    }, 1000);
  };

  // Canvas drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || selectedDoc) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - scrollPos.x,
      y: e.clientY - scrollPos.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setScrollPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const totalDocs = PROJECT_STAGES.flatMap(s => s.nodes).length;
  const completedDocs = PROJECT_STAGES.flatMap(s => s.nodes).filter(n => n.status === 'completed').length;

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 shrink-0">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Strategy Canvas</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Click any document to view & discuss
        </div>
      </header>

        {/* Canvas Area - Draggable */}
        <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={() => setSelectedDoc(null)}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    transform: `translate(${scrollPos.x}px, ${scrollPos.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div className="flex gap-6 items-center">
                    {PROJECT_STAGES.map((stage, index) => (
                        <div key={stage.id} className="flex items-center gap-6">
                            {/* Stage Column */}
                            <div className="flex flex-col gap-3">
                                {/* Stage Title */}
                                <div className="text-center mb-2">
                                    <h3 className="text-xs font-medium text-muted-foreground">
                                        {stage.title}
                                    </h3>
                                </div>

                                {/* Document Cards */}
                                <div className="flex flex-col gap-2">
                                    {stage.nodes.map((node) => {
                                        const statusColors = {
                                          'completed': 'bg-green-500',
                                          'in-progress': 'bg-yellow-500',
                                          'pending': 'bg-muted-foreground/30'
                                        };
                                        const typeColors = {
                                          'idea': 'bg-blue-500',
                                          'prd': 'bg-purple-500',
                                          'design': 'bg-pink-500',
                                          'code': 'bg-green-500'
                                        };

                                        // Calculate overall score
                                        const isPerfect = Object.values(node.scores).every(score => score === 100);
                                        const avgScore = Object.values(node.scores).reduce((a, b) => a + b, 0) / 4;

                                        return (
                                            <div
                                                key={node.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDocClick(node);
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                className={cn(
                                                    "w-64 p-3 border rounded-lg cursor-pointer transition-all group",
                                                    selectedDoc?.id === node.id
                                                      ? "border-primary bg-primary/5"
                                                      : "border-border hover:bg-muted/40",
                                                    // Dim perfect scores
                                                    isPerfect && "opacity-50 hover:opacity-100"
                                                )}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", typeColors[node.type])} />
                                                    <span className="text-xs text-muted-foreground capitalize">{node.type}</span>
                                                    <div className="flex-1" />
                                                    {isPerfect ? (
                                                        <span className="text-[10px] text-green-600 font-medium">✓ Perfect</span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground font-mono">{Math.round(avgScore)}%</span>
                                                    )}
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", statusColors[node.status], node.status === 'in-progress' && 'animate-pulse')} />
                                                </div>

                                                {/* Title */}
                                                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                                    {node.title}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Connection Arrow - 连接两个阶段的中心点 */}
                            {index < PROJECT_STAGES.length - 1 && (
                                <div className="shrink-0">
                                    <svg width="24" height="8" viewBox="0 0 24 8" className="text-border">
                                        <path
                                            d="M0 4 L18 4 L14 1 M18 4 L14 7"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Panel (Sheet/Overlay) */}
        {selectedDoc && (
            <div
                className="absolute top-0 right-0 h-full w-full md:w-[600px] lg:w-[800px] bg-background border-l border-border shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                            <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">{selectedDoc.title}</h2>
                            <p className="text-xs text-muted-foreground capitalize">{selectedDoc.type} • {selectedDoc.status}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClosePanel();
                        }}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Document Preview */}
                    <div className="flex-1 p-6 overflow-y-auto border-r border-border/40 bg-card/30">
                        {/* Quality Scores */}
                        <div className="mb-6 p-4 bg-background/60 border border-border/50 rounded-lg">
                            <h3 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary" />
                                Quality Metrics
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(selectedDoc.scores).map(([key, value]) => {
                                    const barColors = {
                                        100: 'bg-green-500',
                                        high: 'bg-blue-500',    // 80-99
                                        medium: 'bg-yellow-500', // 60-79
                                        low: 'bg-orange-500'     // <60
                                    };
                                    const getColor = (score: number) => {
                                        if (score === 100) return barColors[100];
                                        if (score >= 80) return barColors.high;
                                        if (score >= 60) return barColors.medium;
                                        return barColors.low;
                                    };

                                    const labels: Record<string, string> = {
                                        clarity: '清晰度',
                                        completeness: '完整性',
                                        feasibility: '可行性',
                                        alignment: '对齐度'
                                    };

                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <span className="text-xs text-foreground w-16 shrink-0">{labels[key]}</span>
                                            <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all", getColor(value))}
                                                    style={{ width: `${value}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-10 text-right font-mono tabular-nums">{value}</span>
                                        </div>
                                    );
                                })}
                                {/* Overall Score */}
                                <div className="pt-2 mt-2 border-t border-border/50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-foreground w-16 shrink-0">Overall</span>
                                        <div className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${Object.values(selectedDoc.scores).reduce((a, b) => a + b, 0) / 4}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-primary w-10 text-right tabular-nums">
                                            {Math.round(Object.values(selectedDoc.scores).reduce((a, b) => a + b, 0) / 4)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Content */}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                                {selectedDoc.content}
                            </pre>
                        </div>
                    </div>

                    {/* Contextual Chat */}
                    <div className="w-[320px] flex flex-col bg-background shrink-0">
                        <div className="p-3 border-b text-xs font-medium text-muted-foreground flex items-center gap-2 bg-muted/5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Context Chat
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {getMessages(selectedDoc.id).map((msg) => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <Avatar className="h-6 w-6 border border-border shrink-0">
                                            {msg.role === 'assistant' ? (
                                                <div className="h-full w-full bg-primary/10 flex items-center justify-center"><Bot className="h-3 w-3 text-primary" /></div>
                                            ) : (
                                                <AvatarFallback className="text-[10px]">ME</AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className={`
                                            p-3 rounded-xl text-xs leading-relaxed
                                            ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted border border-border/50 rounded-tl-sm'}
                                        `}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="flex gap-3">
                                        <Avatar className="h-6 w-6 border border-border shrink-0"><div className="h-full w-full bg-primary/10 flex items-center justify-center"><Bot className="h-3 w-3 text-primary" /></div></Avatar>
                                        <div className="flex items-center gap-1 p-3 bg-muted border border-border/50 rounded-xl rounded-tl-sm h-9">
                                            <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="h-1 w-1 bg-primary/40 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-3 border-t bg-background">
                            <div className="relative">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about this doc..."
                                    className="pr-10 h-9 text-xs"
                                />
                                <Button
                                    size="icon"
                                    className="absolute right-1 top-1 h-7 w-7"
                                    variant="ghost"
                                    onClick={handleSend}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
