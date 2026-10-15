import type { Title } from "./Title";

export const filterAndSortTitles = (
  titles: Title[],
  options: {
    filter: "all" | "shows" | "movies" | "anime";
    watchState: "all" | "in-progress" | "completed" | "unwatched";
    sort: "recent" | "title" | "year" | "rating" | "progress";
    query: string;
  }
): Title[] => {
  const normalizedQuery = options.query.trim().toLocaleLowerCase();

  const filtered = titles.filter((title) => {
    if (options.filter === "shows" && (title.type !== "show" || title.anime)) return false;
    if (options.filter === "movies" && (title.type !== "movie" || title.anime)) return false;
    if (options.filter === "anime" && !title.anime) return false;
    if (normalizedQuery && !title.title.toLocaleLowerCase().includes(normalizedQuery)) return false;

    const watched = title.watchedEpisodes ?? 0;
    const released = title.releasedEpisodes ?? 0;
    const completed = title.type === "movie"
      ? Boolean(title.lastWatched)
      : released > 0 && watched >= released;
    const inProgress = title.type === "show" && watched > 0 && released > watched;
    const unwatched = title.type === "movie"
      ? !title.lastWatched
      : watched === 0;

    if (options.watchState === "completed" && !completed) return false;
    if (options.watchState === "in-progress" && !inProgress) return false;
    if (options.watchState === "unwatched" && !unwatched) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (options.sort === "title") return a.title.localeCompare(b.title);
    if (options.sort === "year") return (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.title.localeCompare(b.title);
    if (options.sort === "rating") return (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.title.localeCompare(b.title);
    if (options.sort === "progress") {
      const progress = (title: Title) => {
        if (title.type === "movie") return title.lastWatched ? 1 : 0;
        const released = title.releasedEpisodes ?? 0;
        return released > 0 ? (title.watchedEpisodes ?? 0) / released : 0;
      };
      return progress(b) - progress(a) || a.title.localeCompare(b.title);
    }
    return (b.lastWatched ?? "").localeCompare(a.lastWatched ?? "") || a.title.localeCompare(b.title);
  });
};