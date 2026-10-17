import type { QueryClient } from "@tanstack/react-query";
import { getInsightsContext } from "../endpoints/insights-context_GET.schema";
import { titleEpisodesQuery } from "./useTitleEpisodes";
import { watchHistoryQuery } from "./useWatchHistory";

export const insightsContextQuery = {
  queryKey: ["marquee", "insights-context"] as const,
  queryFn: getInsightsContext,
  retry: false as const,
};

/** Once Home has drawn, load what the other tabs and the likeliest titles need while the phone is idle, so they open
 *  complete (GameDeck warms its top detail pages after Home, October 17). Fresh cache entries are skipped. */
export function warmAppData(client: QueryClient, titleIds: number[]) {
  const run = () => {
    void client.prefetchInfiniteQuery(watchHistoryQuery("all", ""));
    void client.prefetchQuery(insightsContextQuery);
    for (const titleId of [...new Set(titleIds)].slice(0, 4)) void client.prefetchQuery(titleEpisodesQuery(titleId));
  };
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(run, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 500);
  return () => clearTimeout(id);
}
