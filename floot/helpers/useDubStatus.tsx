import { useQuery } from "@tanstack/react-query";
import { getDubStatus } from "../endpoints/dub-status_GET.schema";

/** titleId → has an English dub. Titles that aren't Crunchyroll anime are absent (no badge). */
export const useDubStatus = () => useQuery({
  queryKey: ["marquee", "dub-status"],
  queryFn: getDubStatus,
  select: data => new Map(data.dubs.map(row => [row.titleId, row.hasEnDub])),
  staleTime: 60_000,
  retry: false,
});
