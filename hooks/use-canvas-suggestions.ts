import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import type { CanvasSuggestion } from "@/lib/db/schema";

interface SuggestionsResponse {
  suggestions: CanvasSuggestion[];
  count: number;
}

/**
 * Hook to fetch Canvas suggestions by framework
 *
 * @param projectId - Project ID
 * @param frameworkId - Framework ID (null to disable fetching)
 * @param status - Optional status filter ("pending" | "accepted" | "dismissed")
 * @returns Suggestions data, loading state, error, and mutate function
 */
export function useCanvasSuggestionsByFramework({
  projectId,
  frameworkId,
  status,
}: {
  projectId: string;
  frameworkId: string | null;
  status?: "pending" | "accepted" | "dismissed";
}) {
  const params = new URLSearchParams();
  params.set("projectId", projectId);
  if (frameworkId) params.set("frameworkId", frameworkId);
  if (status) params.set("status", status);

  const swrKey = frameworkId ? `/api/canvas/suggestions?${params.toString()}` : null;

  console.log('[useSuggestionsByFramework] Hook called with:', {
    projectId,
    frameworkId,
    status,
    swrKey,
  });

  const { data, error, isLoading, mutate } = useSWR<SuggestionsResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );

  console.log('[useSuggestionsByFramework] SWR response:', {
    swrKey,
    hasData: !!data,
    suggestionsCount: data?.suggestions?.length || 0,
    isLoading,
    hasError: !!error,
  });

  return {
    suggestions: data?.suggestions || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch Canvas suggestions for a specific node
 *
 * @param nodeId - Node ID (null to disable fetching)
 * @param status - Optional status filter
 * @returns Suggestions data, loading state, error, and mutate function
 */
export function useCanvasSuggestionsByNode({
  nodeId,
  status,
}: {
  nodeId: string | null;
  status?: "pending" | "accepted" | "dismissed";
}) {
  const params = new URLSearchParams();
  if (nodeId) params.set("nodeId", nodeId);
  if (status) params.set("status", status);

  // Need a dummy projectId for API, but it's not used when nodeId is provided
  params.set("projectId", "dummy");

  const { data, error, isLoading, mutate } = useSWR<SuggestionsResponse>(
    nodeId ? `/api/canvas/suggestions?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );

  return {
    suggestions: data?.suggestions || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}
