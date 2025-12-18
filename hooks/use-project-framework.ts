import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProjectFramework(projectId: string) {
  const { data, error, mutate } = useSWR(
    `/api/projects/${projectId}/framework`,
    fetcher
  );

  const setFramework = async (frameworkId: string) => {
    await fetch(`/api/projects/${projectId}/framework`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameworkId }),
    });

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
