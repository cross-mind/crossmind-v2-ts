import useSWR from "swr";
import type { ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";

interface NodeChatResponse {
  chatId: string;
  messages: ChatMessage[];
}

/**
 * Hook to manage Canvas node chats
 *
 * Automatically fetches or creates a chat for the given node
 * Returns null when nodeId is null (lazy loading pattern)
 *
 * @param nodeId - Canvas node ID (null to disable fetching)
 * @returns Chat data, loading state, and error
 */
export function useNodeChat(nodeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<NodeChatResponse>(
    // Only fetch when nodeId is provided
    nodeId ? `/api/canvas/node-chat?nodeId=${nodeId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Avoid duplicate requests within 5 seconds
    }
  );

  return {
    chatId: data?.chatId,
    initialMessages: data?.messages || [],
    isLoading,
    error,
    mutate, // Expose mutate for manual refresh if needed
  };
}
