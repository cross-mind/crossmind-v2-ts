"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarToggle } from "@/components/sidebar-toggle";
import {
  Search,
  Sparkles,
  Star,
  CheckCircle2,
  Clock,
  FileText,
  Code2,
  Zap,
  X,
  Shield,
  Github,
  Globe,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface AgentService {
  id: string;
  name: string;
  provider: string;
  category: "research" | "design" | "development" | "marketing";
  description: string;
  price: string;
  rating: number;
  reviewCount: number;
  workSteps: string[];
  requiredPermissions: {
    type: "github" | "notion" | "stripe" | "vercel" | "none";
    description: string;
  }[];
  deliverables: string[];
  iterationLimit: number;
}

interface ServiceOrder {
  id: string;
  serviceId: string;
  status: "pending" | "in-progress" | "completed" | "feedback";
  iterationsUsed: number;
  iterationsLimit: number;
  feedback?: string;
}

// Mock Data
const MOCK_SERVICES: AgentService[] = [
  {
    id: "service-1",
    name: "Reddit Market Research",
    provider: "CrossMind Official",
    category: "research",
    description: "Deep dive into Reddit communities to understand user pain points, feature requests, and market sentiment around your product idea.",
    price: "$29",
    rating: 4.8,
    reviewCount: 24,
    workSteps: [
      "Analyze specified subreddits and keywords",
      "Extract relevant discussions and comments",
      "Generate insights report with key findings",
      "Provide actionable recommendations"
    ],
    requiredPermissions: [
      { type: "none", description: "No external permissions required" }
    ],
    deliverables: ["Markdown report", "CSV data export"],
    iterationLimit: 3
  },
  {
    id: "service-2",
    name: "Product Hunt Analysis",
    provider: "CrossMind Official",
    category: "research",
    description: "Research similar products on Product Hunt, analyze their positioning, features, and user feedback to inform your strategy.",
    price: "$39",
    rating: 4.9,
    reviewCount: 18,
    workSteps: [
      "Search and filter relevant products",
      "Analyze feature sets and positioning",
      "Compile competitive analysis",
      "Suggest differentiation opportunities"
    ],
    requiredPermissions: [
      { type: "none", description: "No external permissions required" }
    ],
    deliverables: ["Markdown report", "Comparison table"],
    iterationLimit: 3
  },
  {
    id: "service-3",
    name: "Design Document Generation",
    provider: "CrossMind Official",
    category: "design",
    description: "Generate comprehensive design documentation including user flows, wireframes description, and design system recommendations.",
    price: "$49",
    rating: 4.7,
    reviewCount: 31,
    workSteps: [
      "Review product requirements",
      "Create user flow diagrams",
      "Generate wireframe descriptions",
      "Document design system guidelines"
    ],
    requiredPermissions: [
      { type: "notion", description: "Write access to Notion workspace" }
    ],
    deliverables: ["Notion document", "Markdown export"],
    iterationLimit: 5
  },
  {
    id: "service-4",
    name: "GitHub Workflow Setup",
    provider: "CrossMind Official",
    category: "development",
    description: "Automatically configure GitHub Actions workflows for CI/CD, code quality checks, and automated deployments.",
    price: "$59",
    rating: 4.9,
    reviewCount: 42,
    workSteps: [
      "Analyze repository structure",
      "Generate appropriate workflow files",
      "Configure environment variables",
      "Set up branch protection rules"
    ],
    requiredPermissions: [
      { type: "github", description: "Write access to repository" }
    ],
    deliverables: ["GitHub Actions workflows", "Configuration files"],
    iterationLimit: 4
  },
  {
    id: "service-5",
    name: "Waitlist Landing Page",
    provider: "CrossMind Official",
    category: "marketing",
    description: "Generate a complete waitlist landing page with email capture, social proof, and conversion optimization.",
    price: "$79",
    rating: 4.6,
    reviewCount: 15,
    workSteps: [
      "Design landing page structure",
      "Generate HTML/CSS code",
      "Set up email integration",
      "Add analytics tracking"
    ],
    requiredPermissions: [
      { type: "vercel", description: "Deploy access to Vercel project" }
    ],
    deliverables: ["HTML/CSS files", "Deployment guide"],
    iterationLimit: 5
  }
];

const CATEGORY_CONFIG = {
  research: { label: "Research", color: "bg-blue-500", icon: Search },
  design: { label: "Design", color: "bg-pink-500", icon: FileText },
  development: { label: "Development", color: "bg-green-500", icon: Code2 },
  marketing: { label: "Marketing", color: "bg-orange-500", icon: Zap },
};

const MOCK_ORDERS: ServiceOrder[] = [
  {
    id: "order-1",
    serviceId: "service-1",
    status: "completed",
    iterationsUsed: 2,
    iterationsLimit: 3
  },
  {
    id: "order-2",
    serviceId: "service-4",
    status: "in-progress",
    iterationsUsed: 1,
    iterationsLimit: 4
  }
];

export default function AgentHiringPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<AgentService | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const filteredServices = MOCK_SERVICES.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleServiceClick = (service: AgentService) => {
    setSelectedService(service);
    setShowOrderForm(false);
  };

  const handleOrder = () => {
    setShowOrderForm(true);
  };

  const getOrderStatus = (serviceId: string) => {
    return MOCK_ORDERS.find(o => o.serviceId === serviceId);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b shrink-0 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
          <h1 className="text-sm font-medium">Agent Services</h1>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{filteredServices.length} services</span>
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search services..."
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Services List */}
        <div className={cn(
          "flex-1 flex flex-col border-r transition-all",
          selectedService ? "w-1/2" : "w-full"
        )}>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No services found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredServices.map((service) => {
                  const order = getOrderStatus(service.id);
                  const categoryConfig = CATEGORY_CONFIG[service.category];
                  const CategoryIcon = categoryConfig.icon;

                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "group flex items-center gap-4 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors",
                        selectedService?.id === service.id && "bg-muted/60"
                      )}
                      onClick={() => handleServiceClick(service)}
                    >
                      {/* Column 1: Category + Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={cn("h-1.5 w-1.5 rounded-full", categoryConfig.color)} />
                        <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {service.name}
                          </p>
                          <p className="text-xs text-muted-foreground/60 line-clamp-1">
                            {service.provider}
                          </p>
                        </div>
                      </div>

                      {/* Column 2: Rating + Price */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span className="font-medium text-foreground">{service.rating}</span>
                          <span>({service.reviewCount})</span>
                        </div>
                        <span>·</span>
                        <span className="font-medium text-foreground">{service.price}</span>
                        {order && (
                          <>
                            <span>·</span>
                            <span className={cn(
                              order.status === "completed" && "text-green-600",
                              order.status === "in-progress" && "text-blue-600",
                              order.status === "feedback" && "text-yellow-600"
                            )}>
                              {order.status === "completed" && "Completed"}
                              {order.status === "in-progress" && "In Progress"}
                              {order.status === "feedback" && "Feedback"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Service Detail Panel */}
        {selectedService && (
          <div className="w-1/2 flex flex-col border-l bg-background shrink-0">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-md",
                  CATEGORY_CONFIG[selectedService.category].color.replace("bg-", "bg-").replace("-500", "-500/10")
                )}>
                  {(() => {
                    const Icon = CATEGORY_CONFIG[selectedService.category].icon;
                    return <Icon className={cn("h-4 w-4", CATEGORY_CONFIG[selectedService.category].color.replace("bg-", "text-"))} />;
                  })()}
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{selectedService.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedService.provider}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedService(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm text-foreground leading-relaxed">{selectedService.description}</p>
                </div>

                {/* Work Steps */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Work Steps</h3>
                  <ol className="space-y-2">
                    {selectedService.workSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Required Permissions */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Required Permissions</h3>
                  <div className="space-y-2">
                      {selectedService.requiredPermissions.map((perm, index) => {
                      const getIcon = () => {
                        switch (perm.type) {
                          case "github": return <Github className="h-3.5 w-3.5 text-muted-foreground" />;
                          case "notion": return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
                          case "vercel": return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
                          default: return <Shield className="h-3.5 w-3.5 text-muted-foreground" />;
                        }
                      };
                      return (
                        <div key={index} className="flex items-center gap-2 text-xs text-foreground">
                          {getIcon()}
                          <span>{perm.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deliverables */}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Deliverables</h3>
                  <div className="space-y-1">
                    {selectedService.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-foreground">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <span>{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing & Reviews */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{selectedService.price}</span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium text-foreground">{selectedService.rating}</span>
                      <span>({selectedService.reviewCount})</span>
                    </div>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{selectedService.iterationLimit} iterations</span>
                    </div>
                  </div>
                </div>

                {/* Order Form or Status */}
                {!showOrderForm ? (
                  <Button
                    onClick={handleOrder}
                    className="w-full"
                    size="sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Order Service
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Input</label>
                      <Input
                        placeholder="Describe what you need..."
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOrderForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Mock order creation
                          setShowOrderForm(false);
                        }}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                        Confirm Order
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
