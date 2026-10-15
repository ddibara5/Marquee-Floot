import { useInfiniteQuery } from "@tanstack/react-query";
import { getWatchHistory, type OutputType } from "../endpoints/watch-history_GET.schema";

export const useWatchHistory = (enabled: boolean, filter: "all" | "shows" | "movies" | "anime", query: string) =>
  useInfiniteQuery<OutputType>({
    queryKey: ["marquee", "watch-history", filter, query],
    queryFn: ({ pageParam }) => getWatchHistory({ page: pageParam as number, filter, query }),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage ?? undefined,
    enabled,
    retry: false,
  });
