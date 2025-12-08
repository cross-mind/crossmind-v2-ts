"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  Brain,
  Code2,
  Command,
  Layout,
  MessageSquare,
  Plus,
  Sparkles,
  Settings,
  FolderOpen,
  ChevronsUpDown,
} from "lucide-react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
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
  useSidebar,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
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
import { Separator } from "./ui/separator";

export function CrossMindSidebar({ user }: { user: User | undefined }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState("CrossMind MVP");

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
      title: "Incubator",
      items: [
        {
          title: "Strategy Canvas",
          href: "/canvas",
          icon: Sparkles,
        },
        {
          title: "Project Memory",
          href: "/memory",
          icon: Brain,
        },
      ],
    },
    {
      title: "Execution",
      items: [
        {
          title: "Task Board",
          href: "/tasks",
          icon: Layout,
        },
        {
          title: "Development",
          href: "/dev",
          icon: Code2,
        },
        {
          title: "Agent Services",
          href: "/agents",
          icon: MessageSquare,
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
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                          <Command className="size-4" />
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-sm font-semibold leading-none">CrossMind</span>
                          <span className="text-xs text-muted-foreground truncate w-full">{currentProject}</span>
                        </div>
                      </div>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer"
                      onClick={() => setCurrentProject("CrossMind MVP")}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                        <FolderOpen className="size-3.5" />
                      </div>
                      <span className="flex-1 truncate text-sm">CrossMind MVP</span>
                      {currentProject === "CrossMind MVP" && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Plus className="size-4" />
                      <span className="text-sm">New Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Settings className="size-4" />
                      <span className="text-sm">Project Settings</span>
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
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setOpenMobile(false)}
                          >
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

        <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
