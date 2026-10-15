import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  page: z.coerce.number().int().min(0).max(100).default(0),
  filter: z.enum(["all", "shows", "movies", "anime"]).default("all"),
  query: z.string().max(80).default(""),
});

export type HistoryEvent = {
  kind: "episode" | "movie";
  eventId: number;
  watchedAt: Date;
  titleId: number;
  title: string;
  posterPath: string | null;
  isAnime: boolean;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
};

export type UndatedTitle = {
  titleId: number;
  title: string;
  posterPath: string | null;
  isAnime: boolean;
  mediaType: "show" | "movie";
  count: number;
};

export type OutputType = {
  events: HistoryEvent[];
  undated: UndatedTitle[];
  nextPage: number | null;
};

export const getWatchHistory = async (input: z.input<typeof schema>, init?: RequestInit): Promise<OutputType> => {
  const parsed = schema.parse(input);
  const params = new URLSearchParams({
    page: String(parsed.page),
    filter: parsed.filter,
    query: parsed.query,
  });
  const result = await fetch("/_api/watch-history?" + params.toString(), {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const body = superjson.parse<{ error?: string }>(await result.text());
    throw new Error(body.error ?? "Unable to load watch history");
  }
  return superjson.parse<OutputType>(await result.text());
};
