import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useFrameworks() {
  const { data, error, isLoading } = useSWR("/api/frameworks", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 min cache
  });

  return {
    frameworks: data?.frameworks || [],
    isLoading,
    error,
  };
}

export function useFramework(frameworkId: string | null) {
  const { data, error, isLoading } = useSWR(
    frameworkId ? `/api/frameworks/${frameworkId}` : null,
    fetcher
  );

  return {
    framework: data?.framework,
    isLoading,
    error,
  };
}
