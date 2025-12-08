"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const _router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b bg-background px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <Separator orientation="vertical" className="h-4" />
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AI Chat</span>
      </div>

      <div className="flex items-center gap-2">
        {!isReadonly && (
          <VisibilitySelector chatId={chatId} selectedVisibilityType={selectedVisibilityType} />
        )}

        <Button
          asChild
          className="hidden bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 md:flex h-8 text-xs"
          size="sm"
        >
          <Link
            href={"https://vercel.com/templates/next.js/nextjs-ai-chatbot"}
            rel="noreferrer"
            target="_blank"
          >
            <VercelIcon size={14} />
            Deploy
          </Link>
        </Button>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
