"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn, fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

// New props for generalization
export interface ChatProps {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  // New optional props for Canvas mode
  mode?: "full-page" | "panel";
  context?: {
    type: "general" | "canvas";
    nodeId?: string;
    projectId?: string;
  };
  apiEndpoint?: string;
  features?: {
    showHeader?: boolean;
    showArtifact?: boolean;
    allowAttachments?: boolean;
    allowModelSwitch?: boolean;
    compactInput?: boolean;
  };
}

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
  // Default values for new props (backward compatible)
  mode = "full-page",
  context = { type: "general" },
  apiEndpoint = "/api/chat",
  features = {},
}: ChatProps) {
  // Apply feature defaults
  const {
    showHeader = true,
    showArtifact = true,
    allowAttachments = true,
    allowModelSwitch = true,
    compactInput = false,
  } = features;
  const router = useRouter();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();

  // Handle browser back/forward navigation (only in full-page mode)
  useEffect(() => {
    if (mode !== "full-page") {
      return;
    }

    const handlePopState = () => {
      // When user navigates back/forward, refresh to sync with URL
      router.refresh();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router, mode]);
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const { messages, setMessages, sendMessage, status, stop, regenerate, resumeStream } =
    useChat<ChatMessage>({
      id,
      messages: initialMessages,
      experimental_throttle: 100,
      generateId: generateUUID,
      transport: new DefaultChatTransport({
        api: apiEndpoint,  // Use dynamic endpoint
        fetch: async (...args) => {
          console.log(`[Chat Component] Fetching: ${args[0]} (mode: ${mode})`);
          try {
            const result = await fetchWithErrorHandlers(...args);
            console.log(`[Chat Component] Fetch successful`);
            return result;
          } catch (error) {
            console.error(`[Chat Component] Fetch failed:`, error);
            throw error;
          }
        },
        prepareSendMessagesRequest(request) {
          // Base request body
          const baseBody = {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
          };

          // Add context-specific fields
          if (context.type === "canvas") {
            return {
              body: {
                sessionId: id,  // For canvas, id is the chat session ID
                ...baseBody,
                nodeContext: {
                  nodeId: context.nodeId,
                  projectId: context.projectId,
                },
              },
            };
          }

          // General chat (original behavior)
          return {
            body: {
              ...baseBody,
              selectedVisibilityType: visibilityType,
              ...request.body,
            },
          };
        },
      }),
      onData: (dataPart) => {
        setDataStream((ds) => (ds ? [...ds, dataPart] : []));
        if (dataPart.type === "data-usage") {
          setUsage(dataPart.data);
        }
      },
      onFinish: () => {
        // Only mutate chat history in full-page mode (not in Canvas panel mode)
        if (mode === "full-page") {
          mutate(unstable_serialize(getChatHistoryPaginationKey));
        }
      },
      onError: (error) => {
        console.error("[Chat Component] Error occurred:", error);

        if (error instanceof ChatSDKError) {
          // Check if it's a credit card error
          if (error.message?.includes("AI Gateway requires a valid credit card")) {
            setShowCreditCardAlert(true);
          } else {
            toast({
              type: "error",
              description: error.message,
            });
          }
        } else {
          // Log unexpected errors
          console.error("[Chat Component] Unexpected error:", error);
          toast({
            type: "error",
            description: "An unexpected error occurred. Please try again.",
          });
        }
      },
    });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    // Only handle query parameter in full-page mode (not in panel mode for Canvas)
    if (query && !hasAppendedQuery && mode === "full-page") {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id, mode]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className={cn(
        "overscroll-behavior-contain flex min-w-0 touch-pan-y flex-col bg-background",
        mode === "panel" ? "h-full" : "h-dvh"
      )}>
        {showHeader && (
          <ChatHeader
            chatId={id}
            isReadonly={isReadonly}
            selectedVisibilityType={initialVisibilityType}
          />
        )}

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
          compact={mode === "panel"}
        />

        <div className={cn(
          "sticky bottom-0 z-1 flex gap-2 border-t-0 bg-background",
          mode === "panel"
            ? "w-full px-3 pb-3"  // Compact for panel
            : "mx-auto w-full max-w-4xl px-2 pb-3 md:px-4 md:pb-4"  // Original for full-page
        )}>
          {!isReadonly && (
            <MultimodalInput
              attachments={allowAttachments ? attachments : []}
              chatId={id}
              input={input}
              messages={messages}
              onModelChange={allowModelSwitch ? setCurrentModelId : undefined}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={allowAttachments ? setAttachments : () => {}}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              usage={usage}
              compact={compactInput}
              mode={mode}
            />
          )}
        </div>
      </div>

      {showArtifact && (
        <Artifact
          attachments={attachments}
          chatId={id}
          input={input}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={currentModelId}
          selectedVisibilityType={visibilityType}
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={stop}
          votes={votes}
        />
      )}

      <AlertDialog onOpenChange={setShowCreditCardAlert} open={showCreditCardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to activate Vercel AI
              Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank",
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
