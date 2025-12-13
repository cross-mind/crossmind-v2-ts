import { useCallback, useRef } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook for managing node positions per framework with debounced persistence
 */
export function useNodePositions(frameworkId: string | null, nodeIds: string[]) {
  // Fetch positions from database
  const { data, error, mutate } = useSWR(
    frameworkId && nodeIds.length > 0
      ? `/api/canvas/positions?frameworkId=${frameworkId}&nodeIds=${nodeIds.join(",")}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min cache
    }
  );

  // Debounce state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPositionsRef = useRef<Array<{ nodeId: string; x: number; y: number }>>([]);

  /**
   * Save positions to database with debouncing
   * Collects position updates and saves them in batch after 2 seconds of inactivity
   */
  const savePositions = useCallback(
    (positions: Array<{ nodeId: string; x: number; y: number }>) => {
      if (!frameworkId) return;

      // Merge with pending positions (newer positions override older ones)
      const positionsMap = new Map(
        [...pendingPositionsRef.current, ...positions].map(p => [p.nodeId, p])
      );
      pendingPositionsRef.current = Array.from(positionsMap.values());

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout to save after 2 seconds
      saveTimeoutRef.current = setTimeout(async () => {
        const toSave = pendingPositionsRef.current;
        pendingPositionsRef.current = [];

        console.log("[useNodePositions] Saving positions to database:", {
          frameworkId,
          count: toSave.length,
        });

        try {
          await fetch("/api/canvas/positions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frameworkId, positions: toSave }),
          });

          // Revalidate cache
          mutate();
        } catch (error) {
          console.error("[useNodePositions] Failed to save positions:", error);
        }
      }, 2000); // 2 second debounce
    },
    [frameworkId, mutate]
  );

  /**
   * Force immediate save (useful for framework switch)
   */
  const saveImmediately = useCallback(async () => {
    if (!frameworkId || pendingPositionsRef.current.length === 0) return;

    // Clear timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const toSave = pendingPositionsRef.current;
    pendingPositionsRef.current = [];

    console.log("[useNodePositions] Force saving positions immediately:", {
      frameworkId,
      count: toSave.length,
    });

    try {
      await fetch("/api/canvas/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameworkId, positions: toSave }),
      });

      mutate();
    } catch (error) {
      console.error("[useNodePositions] Failed to save positions:", error);
    }
  }, [frameworkId, mutate]);

  return {
    positions: data?.positions || {}, // { nodeId: { x, y } }
    savePositions,
    saveImmediately,
    isLoading: !data && !error,
  };
}
