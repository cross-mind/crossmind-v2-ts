import useSWR from "swr";
import type { CanvasNode, CanvasNodeActivity, CanvasNodeComment } from "@/lib/db/schema";

const fetcher = (url: string) => {
  console.log('[SWR Fetcher] Fetching:', url);
  return fetch(url).then((r) => {
    console.log('[SWR Fetcher] Response status:', r.status, 'for', url);
    if (!r.ok) {
      console.error('[SWR Fetcher] Fetch failed:', r.status, r.statusText);
      throw new Error("Failed to fetch");
    }
    return r.json().then(data => {
      console.log('[SWR Fetcher] Data received:', Object.keys(data), 'nodes count:', data.nodes?.length);
      return data;
    });
  });
};

/**
 * Hook to fetch all canvas nodes for a project
 */
export function useCanvasNodes(projectId: string | null) {
  const swrKey = projectId ? `/api/canvas?projectId=${projectId}` : null;

  const { data, error, mutate, isLoading } = useSWR<{ nodes: CanvasNode[] }>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false, // Canvas data is manually edited, no need to auto-refresh
      dedupingInterval: 0,       // Disable deduplication to ensure fresh data on project switch
      keepPreviousData: false,   // Don't keep previous data when key changes
    },
  );

  // Log when projectId or data changes
  console.log('[useCanvasNodes] Hook state:', {
    projectId,
    swrKey,
    hasData: !!data,
    nodeCount: data?.nodes?.length || 0,
    isLoading,
    isError: !!error,
  });

  return {
    nodes: data?.nodes,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch a single canvas node by ID
 */
export function useCanvasNode(nodeId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<{ node: CanvasNode }>(
    nodeId ? `/api/canvas/${nodeId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    node: data?.node,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch comments for a canvas node
 */
export function useCanvasComments(nodeId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<{ comments: CanvasNodeComment[] }>(
    nodeId ? `/api/canvas/${nodeId}/comments` : null,
    fetcher,
  );

  return {
    comments: data?.comments ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch activities for a canvas node
 */
export function useCanvasActivities(nodeId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<{ activities: CanvasNodeActivity[] }>(
    nodeId ? `/api/canvas/${nodeId}/activities` : null,
    fetcher,
  );

  return {
    activities: data?.activities ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
