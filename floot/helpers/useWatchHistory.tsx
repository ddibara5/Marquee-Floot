import { useInfiniteQuery } from "@tanstack/react-query";
import { getWatchHistory, type OutputType } from "../endpoints/watch-history_GET.schema";

type Filter = "all" | "shows" | "movies" | "anime";

// Shared with the warm-up after Home loads, so both use the same cache entry.
export const watchHistoryQuery = (filter: Filter, query: string) => ({
  queryKey: ["marquee", "watch-history", filter, query] as const,
  queryFn: ({ pageParam }: { pageParam: unknown }) => getWatchHistory({ page: pageParam as number, filter, query }),
  initialPageParam: 0,
  getNextPageParam: (lastPage: OutputType) => lastPage.nextPage ?? undefined,
  retry: false as const,
});

export const useWatchHistory = (enabled: boolean, filter: Filter, query: string) =>
  useInfiniteQuery({ ...watchHistoryQuery(filter, query), enabled });
