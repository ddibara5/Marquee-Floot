import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type {
  MarqueeEpisodes,
  MarqueeSeasons,
  MarqueeTitleWatchEvents,
  MarqueeWatchEvents,
} from "../helpers/schema";

export const schema = z.object({
  titleId: z.coerce.number().int().positive(),
});

export type OutputType = {
  seasons: Selectable<MarqueeSeasons>[];
  episodes: Selectable<MarqueeEpisodes>[];
  watchEvents: Selectable<MarqueeWatchEvents>[];
  undatedEpisodeIds?: number[];
  unwatchedEpisodeIds?: number[];
  manualCompletionIds?: number[];
  seriesCompletionIds?: number[];
  seriesCorrectedIds?: number[];
  seasonRatings?: { seasonId: number; score: number; source: string | null }[];
  seasonStatuses?: { seasonId: number; status: string }[];
  movieEvents?: Selectable<MarqueeTitleWatchEvents>[];
  movieUndated?: boolean;
  manualStatus?: string | null;
  localRating?: number | null;
  traktOutbox?: { localEventId: number; kind: string; state: string; lastError: string | null }[];
};

export const getTitleEpisodes = async (
  body: z.infer<typeof schema>,
  init?: RequestInit
): Promise<OutputType> => {
  const input = schema.parse(body);
  const params = new URLSearchParams({ titleId: String(input.titleId) });
  const result = await fetch("/_api/title-episodes?" + params.toString(), {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!result.ok) {
    const parsed = superjson.parse<{ error?: string }>(await result.text());
    throw new Error(parsed.error ?? "Unable to load episode details");
  }

  return superjson.parse<OutputType>(await result.text());
};