import { useQuery } from "@tanstack/react-query";
import { getTitles } from "../endpoints/titles_GET.schema";
import type { Title } from "./Title";

export const useTitles = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: ["marquee", "titles"],
    queryFn: async (): Promise<Title[]> => {
      const result = await getTitles();
      return result.titles.map((row) => ({
        id: String(row.id),
        title: row.displayTitle,
        canonicalTitle: row.canonicalTitle ?? undefined,
        type: row.mediaType,
        year: row.releaseYear ?? undefined,
        anime: row.isAnime,
        lastWatched: row.lastWatchedAt ? new Date(row.lastWatchedAt).toISOString() : undefined,
        watchedEpisodes: row.watchedEpisodes,
        releasedEpisodes: row.releasedEpisodes,
        score: row.score === null ? undefined : Number(row.score),
        posterPath: row.tmdbPosterPath ?? undefined,
        backdropPath: row.tmdbBackdropPath ?? undefined,
        overview: row.overview ?? undefined,
        tmdbStatus: row.tmdbStatus ?? undefined,
      }));
    },
    retry: false,
  });