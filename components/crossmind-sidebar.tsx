"use client";

import {
  Brain,
  ChevronsUpDown,
  Command,
  FolderOpen,
  Layout,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "next-auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { getChatHistoryPaginationKey, SidebarHistory } from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Check } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface Project {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "member" | "guest";
}

export function CrossMindSidebar({ user }: { user: User | undefined }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Project management state
  const currentProjectId = searchParams?.get("projectId");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Debug: Log state changes
  useEffect(() => {
    console.log("[Sidebar State] projects changed:", projects.length, projects);
  }, [projects]);

  useEffect(() => {
    console.log("[Sidebar State] currentProject changed:", currentProject?.name || "null");
  }, [currentProject]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        console.log("[Sidebar] Fetching projects...");
        const response = await fetch("/api/projects", {
          credentials: "include", // Ensure cookies are sent
          cache: "no-store", // Disable cache
        });
        console.log("[Sidebar] Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("[Sidebar] Received data:", JSON.stringify(data, null, 2));
          console.log("[Sidebar] Received projects:", data.projects?.length || 0, data.projects);

          const projectsArray = Array.isArray(data.projects) ? data.projects : [];
          console.log("[Sidebar] Setting projects state:", projectsArray.length, projectsArray);
          setProjects(projectsArray);

          // Set current project
          if (currentProjectId) {
            const current = projectsArray.find((p: Project) => p.id === currentProjectId);
            console.log("[Sidebar] Found current project by ID:", current?.name || "null");
            if (current) {
              setCurrentProject(current);
            } else {
              // URL has projectId but it's not in user's projects
              console.log("[Sidebar] URL projectId not found in user's projects");
              if (projectsArray.length > 0) {
                console.log("[Sidebar] User has projects, using first project instead");
                setCurrentProject(projectsArray[0]);
                // Update URL to match the first project
                router.replace(`/canvas?projectId=${projectsArray[0].id}`);
              } else {
                // User has no projects - keep the projectId in URL (they might have access as guest/member)
                console.log("[Sidebar] User has no projects, but keeping URL projectId (possible guest access)");
                setCurrentProject(null);
                // DON'T navigate away - let Canvas page handle the projectId
              }
            }
          } else if (projectsArray.length > 0) {
            // If no currentProjectId, try to load last accessed project from localStorage
            let projectIdToUse: string | null = null;
            if (typeof window !== "undefined") {
              const lastProjectId = localStorage.getItem("lastProjectId");
              if (lastProjectId) {
                const lastProject = projectsArray.find((p: Project) => p.id === lastProjectId);
                if (lastProject) {
                  projectIdToUse = lastProjectId;
                  console.log("[Sidebar] Restored last accessed project from localStorage:", lastProject.name);
                } else {
                  console.log("[Sidebar] Last project from localStorage not found, removing from storage");
                  localStorage.removeItem("lastProjectId");
                }
              }
            }

            // Use last project or first project
            const targetProject = projectIdToUse
              ? projectsArray.find((p: Project) => p.id === projectIdToUse) || projectsArray[0]
              : projectsArray[0];

            console.log("[Sidebar] No currentProjectId, setting project:", targetProject.name);
            setCurrentProject(targetProject);
            // Update URL to include the projectId
            router.replace(`/canvas?projectId=${targetProject.id}`);
          } else {
            console.log("[Sidebar] No projects found, clearing current project");
            setCurrentProject(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("[Sidebar] Failed to fetch projects, status:", response.status, errorData);
        }
      } catch (error) {
        console.error("[Sidebar] Failed to fetch projects:", error);
      } finally {
        setIsProjectsLoading(false);
      }
    }

    fetchProjects();
  }, [currentProjectId]);

  // Switch project
  const handleSwitchProject = (projectId: string) => {
    setOpenMobile(false);
    // Save last accessed project to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("lastProjectId", projectId);
      console.log("[Sidebar] Saved last project to localStorage:", projectId);
    }
    router.push(`/canvas?projectId=${projectId}`);
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProject = data.project;

        // Add to projects list
        setProjects((prev) => [newProject, ...prev]);

        // Close dialog
        setIsDialogOpen(false);
        setNewProjectName("");
        setNewProjectDescription("");

        // Navigate to new project
        setOpenMobile(false);
        router.push(`/canvas?projectId=${newProject.id}`);
      } else {
        console.error("Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  const isChatPage = pathname === "/" || pathname?.startsWith("/chat");

  const navItems = [
    {
      title: "Workspace",
      items: [
        {
          title: "Strategy Canvas",
          href: "/canvas",
          icon: Sparkles,
        },
      ],
    },
  ];

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0">
        <SidebarHeader>
          <SidebarMenu>
            {/* Integrated Logo & Project Selector */}
            <div className="flex flex-row items-center justify-between gap-2">
              <SidebarMenuItem className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="w-full data-[state=open]:bg-accent"
                      size="lg"
                      disabled={isProjectsLoading}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                          <Command className="size-4" />
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-sm font-semibold leading-none">CrossMind</span>
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {isProjectsLoading
                              ? "Loading..."
                              : currentProject?.name || projects[0]?.name || "Select Project"}
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[280px]"
                  >
                    <DropdownMenuLabel>Projects</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {(() => {
                      console.log("[Sidebar Dropdown] Rendering projects list, count:", projects.length);
                      return projects.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No projects yet
                        </div>
                      ) : (
                        projects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => handleSwitchProject(project.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div className="flex size-6 items-center justify-center rounded-md border bg-background shrink-0">
                            <FolderOpen className="size-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {project.description}
                              </div>
                            )}
                          </div>
                          {currentProjectId === project.id && (
                            <Check className="size-4 shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))
                    );
                    })()}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <Plus className="size-4" />
                      <span className="text-sm">New Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>

              {/* Chat Actions (only visible on chat pages) */}
              {isChatPage && (
                <div className="flex flex-row gap-1">
                  {user && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-8 w-8 p-0"
                          onClick={() => setShowDeleteAllDialog(true)}
                          type="button"
                          variant="ghost"
                        >
                          <TrashIcon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent align="end" className="hidden md:block">
                        Delete All Chats
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setOpenMobile(false);
                          router.push("/");
                          router.refresh();
                        }}
                        type="button"
                        variant="ghost"
                      >
                        <PlusIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="hidden md:block">
                      New Chat
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* AI Chat Section */}
          <SidebarGroup>
            <SidebarGroupLabel>AI Chat</SidebarGroupLabel>
            <SidebarGroupContent>
              {user ? (
                <SidebarHistory user={user} />
              ) : (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Chat">
                      <Link href="/" onClick={() => setOpenMobile(false)}>
                        <MessageSquare className="h-4 w-4" />
                        <span>Chat</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator className="my-2" />

          {/* CrossMind Features */}
          {navItems.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                          <Link href={item.href} onClick={() => setOpenMobile(false)}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 px-2">
            <ThemeToggle />
            {user && <div className="flex-1"><SidebarUserNav user={user} /></div>}
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog onOpenChange={setShowDeleteAllDialog} open={showDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your chats and remove
              them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="My Awesome Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="A brief description of your project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
