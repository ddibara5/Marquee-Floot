import type { QueryClient } from "@tanstack/react-query";
import { getInsightsContext } from "../endpoints/insights-context_GET.schema";
import { titleEpisodesQuery } from "./useTitleEpisodes";
import { watchHistoryQuery } from "./useWatchHistory";

export const insightsContextQuery = {
  queryKey: ["marquee", "insights-context"] as const,
  queryFn: getInsightsContext,
  retry: false as const,
};

/** Shortly after Home has drawn, load what the other tabs and the likeliest titles need, so they open complete
 *  (GameDeck warms its top detail pages after Home, October 17). Fresh cache entries are skipped. A plain timer, not
 *  requestIdleCallback, which iPhone WebKit does not reliably provide. */
export function warmAppData(client: QueryClient, titleIds: number[]) {
  const run = () => {
    void client.prefetchInfiniteQuery(watchHistoryQuery("all", ""));
    void client.prefetchQuery(insightsContextQuery);
    for (const titleId of [...new Set(titleIds)].slice(0, 4)) void client.prefetchQuery(titleEpisodesQuery(titleId));
  };
  const id = setTimeout(run, 1000);
  return () => clearTimeout(id);
}
