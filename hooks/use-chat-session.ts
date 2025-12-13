import useSWR from "swr";
import type { ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";

interface ChatSessionResponse {
  sessionId: string;
  messages: ChatMessage[];
}

/**
 * Hook to manage Canvas node chat sessions
 *
 * Automatically fetches or creates a chat session for the given node
 * Returns null when nodeId is null (lazy loading pattern)
 *
 * @param nodeId - Canvas node ID (null to disable fetching)
 * @returns Chat session data, loading state, and error
 */
export function useChatSession(nodeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ChatSessionResponse>(
    // Only fetch when nodeId is provided
    nodeId ? `/api/canvas/chat-session?nodeId=${nodeId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Avoid duplicate requests within 5 seconds
    }
  );

  return {
    sessionId: data?.sessionId,
    initialMessages: data?.messages || [],
    isLoading,
    error,
    mutate, // Expose mutate for manual refresh if needed
  };
}
