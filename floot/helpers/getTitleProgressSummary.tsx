import type { Title } from "./Title";

export type TitleProgressSummary = {
  watched: number;
  released: number;
  remaining: number;
  percent: number;
  status: "in-progress" | "caught-up" | "complete" | "unwatched";
  statusLabel: "In progress" | "Caught up" | "Complete" | "Unwatched";
};

export const getTitleProgressSummary = (title: Title): TitleProgressSummary => {
  if (title.type === "movie") {
    const complete = Boolean(title.lastWatched || (title.watchedEpisodes ?? 0) > 0);
    return {
      watched: complete ? 1 : 0,
      released: 1,
      remaining: complete ? 0 : 1,
      percent: complete ? 100 : 0,
      status: complete ? "complete" : "unwatched",
      statusLabel: complete ? "Complete" : "Unwatched",
    };
  }

  const watched = title.watchedEpisodes ?? 0;
  const released = title.releasedEpisodes ?? 0;
  const percent = released > 0 ? Math.min(100, Math.round((watched / released) * 100)) : 0;
  const remaining = Math.max(0, released - watched);
  const allReleasedWatched = released > 0 && watched >= released;
  const isFinal = ["ended", "canceled", "cancelled"].includes(title.tmdbStatus?.toLowerCase() ?? "");
  const complete = allReleasedWatched && isFinal;
  const caughtUp = allReleasedWatched && !isFinal;
  const inProgress = watched > 0 && !allReleasedWatched;

  return {
    watched,
    released,
    remaining,
    percent,
    status: complete ? "complete" : caughtUp ? "caught-up" : inProgress ? "in-progress" : "unwatched",
    statusLabel: complete ? "Complete" : caughtUp ? "Caught up" : inProgress ? "In progress" : "Unwatched",
  };
};