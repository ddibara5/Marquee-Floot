import { useQuery } from "@tanstack/react-query";
import { getTitleEpisodes } from "../endpoints/title-episodes_GET.schema";

// Shared with AppShell's touch-down prefetch, so both use the same cache entry.
export const titleEpisodesQuery = (titleId: number) => ({
  queryKey: ["marquee", "title-episodes", titleId] as const,
  queryFn: () => getTitleEpisodes({ titleId }),
  retry: false as const,
});

export const useTitleEpisodes = (titleId: number | null) =>
  useQuery({
    ...titleEpisodesQuery(titleId as number),
    enabled: titleId !== null,
  });
