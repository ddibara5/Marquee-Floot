export type Title = {
  id: string;
  title: string;
  canonicalTitle?: string;
  type: "show" | "movie";
  year?: number;
  anime?: boolean;
  lastWatched?: string;
  watchedEpisodes?: number;
  releasedEpisodes?: number;
  score?: number;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
  tmdbStatus?: string;
};