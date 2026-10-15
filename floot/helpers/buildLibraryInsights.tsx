import type { Title } from "./Title";
import { getTitleProgressSummary } from "./getTitleProgressSummary";

export type LibraryInsights = {
  total: number;
  completed: number;
  inProgress: number;
  paused: number;
  dropped: number;
  unwatched: number;
  completionRate: number;
  watchedEpisodes: number;
  releasedEpisodes: number;
  episodeProgressRate: number;
  shows: number;
  movies: number;
  anime: number;
  ratedCount: number;
  averageRating: number | null;
  recentCount: number;
  topRated: Title[];
};

export const buildLibraryInsights = (
  titles: Title[],
  now: Date = new Date(),
  manualStatuses: Map<string, string> = new Map()
): LibraryInsights => {
  let completed = 0;
  let inProgress = 0;
  let paused = 0;
  let dropped = 0;
  let unwatched = 0;
  let watchedEpisodes = 0;
  let releasedEpisodes = 0;
  let shows = 0;
  let movies = 0;
  let anime = 0;

  for (const title of titles) {
    const progress = getTitleProgressSummary(title);
    const manual = manualStatuses.get(title.id);
    if (manual === "paused") paused += 1;
    else if (manual === "dropped") dropped += 1;
    else if (progress.status === "complete") completed += 1;
    else if (progress.status === "in-progress" || progress.status === "caught-up") inProgress += 1;
    else if (progress.status === "unwatched") unwatched += 1;

    if (title.anime) anime += 1;
    else if (title.type === "show") shows += 1;
    else movies += 1;

    if (title.type === "show") {
      watchedEpisodes += title.watchedEpisodes ?? 0;
      releasedEpisodes += title.releasedEpisodes ?? 0;
    }
  }

  const rated = titles.filter((title) => title.score !== undefined);
  const averageRating = rated.length
    ? rated.reduce((sum, title) => sum + (title.score ?? 0), 0) / rated.length
    : null;

  const recentThreshold = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const recentCount = titles.filter((title) => {
    if (!title.lastWatched) return false;
    const watchedAt = new Date(title.lastWatched).getTime();
    return Number.isFinite(watchedAt) && watchedAt >= recentThreshold && watchedAt <= now.getTime();
  }).length;

  const topRated = rated
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title))
    .slice(0, 3);

  return {
    total: titles.length,
    completed,
    inProgress,
    paused,
    dropped,
    unwatched,
    completionRate: titles.length ? Math.round((completed / titles.length) * 100) : 0,
    watchedEpisodes,
    releasedEpisodes,
    episodeProgressRate: releasedEpisodes
      ? Math.round((watchedEpisodes / releasedEpisodes) * 100)
      : 0,
    shows,
    movies,
    anime,
    ratedCount: rated.length,
    averageRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
    recentCount,
    topRated,
  };
};