import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProjectFramework(projectId: string) {
  const swrKey = `/api/projects/${projectId}/framework`;

  console.log('[useProjectFramework] Hook called with:', {
    projectId,
    swrKey,
  });

  const { data, error, mutate } = useSWR(
    swrKey,
    fetcher
  );

  console.log('[useProjectFramework] SWR response:', {
    swrKey,
    hasData: !!data,
    frameworkId: data?.framework?.sourceFrameworkId,
    frameworkName: data?.framework?.name,
    healthScore: data?.framework?.healthScore,
    dimensionsCount: data?.dimensions?.length || 0,
    isLoading: !data && !error,
    hasError: !!error,
  });

  const setFramework = async (frameworkId: string) => {
    console.log('[useProjectFramework] setFramework called with:', {
      projectId,
      frameworkId,
    });

    await fetch(`/api/projects/${projectId}/framework`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkId }),
    });

    console.log('[useProjectFramework] Framework updated, calling mutate()...');
    mutate();
  };

  return {
    framework: data?.framework,
    projectFrameworkId: data?.projectFrameworkId,
    dimensions: data?.dimensions || [],
    setFramework,
    isLoading: !data && !error,
  };
}
