import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useNodeAffinities(projectId: string, frameworkId: string | null) {
  const { data, error, mutate } = useSWR(
    frameworkId
      ? `/api/canvas/affinities?projectId=${projectId}&frameworkId=${frameworkId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min cache
    }
  );

  const updateAffinity = async (nodeId: string, affinities: Record<string, number>) => {
    await fetch(`/api/canvas/${nodeId}/affinities`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkId, affinities }),
    });

    mutate();
  };

  return {
    nodeAffinities: data?.affinities || {}, // { nodeId: { zoneKey: weight } }
    updateAffinity,
    isLoading: !data && !error,
  };
}
