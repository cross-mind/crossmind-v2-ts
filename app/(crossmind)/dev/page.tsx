"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Github,
  Code2,
  Settings,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  GitBranch,
  ChevronDown,
  Plus,
  Lock,
  Globe,
  CheckCircle
} from "lucide-react";

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  description?: string;
  url: string;
  createdAt: string;
}

const MOCK_REPOS: GitHubRepo[] = [
  {
    id: "repo-1",
    name: "crossmind-mvp",
    fullName: "ivan/crossmind-mvp",
    private: false,
    description: "CrossMind MVP - Product incubation platform",
    url: "https://github.com/ivan/crossmind-mvp",
    createdAt: "2024-12-01T10:00:00"
  }
];

export default function DevDashboardPage() {
  const [isGitHubConnected] = useState(true);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>(MOCK_REPOS);

  const handleCreateRepo = () => {
    if (!newRepoName.trim()) return;
    const newRepo: GitHubRepo = {
      id: `repo-${Date.now()}`,
      name: newRepoName,
      fullName: `ivan/${newRepoName}`,
      private: newRepoPrivate,
      description: newRepoDesc,
      url: `https://github.com/ivan/${newRepoName}`,
      createdAt: new Date().toISOString()
    };
    setRepos([...repos, newRepo]);
    setNewRepoName("");
    setNewRepoDesc("");
    setNewRepoPrivate(false);
    setShowCreateRepo(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 h-14">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-medium">Development</h1>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">ivan/crossmind-mvp</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Button>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Workflows List + GitHub Integration */}
        <div className="flex-1 flex flex-col border-r">
          {/* GitHub Integration Section */}
          <Collapsible defaultOpen={true} className="border-b">
            <CollapsibleTrigger className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">GitHub Integration</span>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground">{repos.length} repos</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 space-y-4 bg-muted/10">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">GitHub</span>
                    <span className="text-xs text-muted-foreground/60">·</span>
                    {isGitHubConnected ? (
                      <>
                        <span className="text-xs text-muted-foreground">Connected</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">Not connected</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      </>
                    )}
                  </div>
                  {!isGitHubConnected && (
                    <Button size="sm" className="h-7 text-xs">
                      <Github className="h-3.5 w-3.5 mr-1.5" />
                      Connect
                    </Button>
                  )}
                </div>

                {/* Repositories List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Repositories</Label>
                    {isGitHubConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateRepo(!showCreateRepo)}
                        className="h-7 text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Repo
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {repos.map((repo) => (
                      <div key={repo.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {repo.private ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-medium text-foreground truncate">{repo.fullName}</span>
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{repo.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(repo.url, '_blank')}
                          className="h-7 w-7"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create Repository Form */}
                {showCreateRepo && (
                  <div className="p-4 border rounded-lg bg-background space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Repository Name</Label>
                      <Input
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        placeholder="crossmind-feature"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">Description</Label>
                      <Input
                        value={newRepoDesc}
                        onChange={(e) => setNewRepoDesc(e.target.value)}
                        placeholder="Optional description"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="rounded text-primary h-3.5 w-3.5"
                      />
                      <Label className="text-xs text-muted-foreground">Private repository</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCreateRepo(false);
                          setNewRepoName("");
                          setNewRepoDesc("");
                        }}
                        className="flex-1 h-8 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateRepo}
                        className="flex-1 h-8 text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Create
                      </Button>
                    </div>
                  </div>
                )}

                {/* Configuration Sync */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Configuration Sync</Label>
                  <div className="p-3 border rounded-lg bg-background space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">Project Description</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Sync
                      </Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">Environment Variables</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Sync
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Workflows Section */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Recent Workflows</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <ExternalLink className="h-3 w-3" />
                View All
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="divide-y divide-border/50">
                {[
                  { name: "Deploy to Production", status: "success", branch: "main", time: "10m ago", duration: "2m 14s" },
                  { name: "Run Tests", status: "success", branch: "main", time: "2h ago", duration: "45s" },
                  { name: "AI Code Review", status: "running", branch: "develop", time: "Just now", duration: "Running..." },
                  { name: "Build Docker Image", status: "success", branch: "main", time: "3h ago", duration: "1m 32s" },
                  { name: "Lint & Format", status: "success", branch: "feature/ui", time: "5h ago", duration: "12s" },
                ].map((workflow, i) => (
                  <div key={i} className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors">
                    {/* Column 1: Status + Name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {workflow.status === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                      )}
                      <span className="text-sm text-foreground truncate">{workflow.name}</span>
                    </div>

                    {/* Column 2: Branch */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 shrink-0">
                      <GitBranch className="h-3 w-3" />
                      <span>{workflow.branch}</span>
                    </div>

                    {/* Column 3: Duration + Time */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
                      <span className="font-mono">{workflow.duration}</span>
                      <span>·</span>
                      <span>{workflow.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Agent Config */}
        <div className="w-80 shrink-0 flex flex-col bg-muted/20">
          <div className="px-6 py-3 border-b">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">AI Agent</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Cursor</span>
                  <span className="text-xs text-muted-foreground/60">·</span>
                  <span className="text-xs text-muted-foreground">Connected</span>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Permissions</label>
              <div className="space-y-2 p-3 border rounded-lg bg-background">
                <div className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked readOnly className="rounded text-primary h-3.5 w-3.5" />
                  <span>Read Repo</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked readOnly className="rounded text-primary h-3.5 w-3.5" />
                  <span>Create PRs</span>
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">API Key</label>
              <div className="relative">
                <Input
                  type="password"
                  value="sk-................"
                  readOnly
                  className="font-mono text-xs h-9 bg-background"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">
                  Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
