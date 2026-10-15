import { buildLibraryInsights } from "./buildLibraryInsights";
import type { Title } from "./Title";

describe("buildLibraryInsights", () => {
  const titles: Title[] = [
    { id: "1", title: "Current Show", type: "show", watchedEpisodes: 2, releasedEpisodes: 8, lastWatched: "2026-09-20T00:00:00Z", score: 8 },
    { id: "2", title: "Complete Show", type: "show", watchedEpisodes: 8, releasedEpisodes: 8, lastWatched: "2026-08-01T00:00:00Z", score: 10, tmdbStatus: "Ended" },
    { id: "3", title: "Watched Movie", type: "movie", lastWatched: "2026-09-22T00:00:00Z" },
    { id: "4", title: "Anime", type: "show", anime: true, watchedEpisodes: 0, releasedEpisodes: 12, score: 9 },
  ];

  it("summarizes watch state and episode progress", () => {
    const insights = buildLibraryInsights(titles, new Date("2026-09-25T00:00:00Z"));
    expect(insights.total).toBe(4);
    expect(insights.completed).toBe(2);
    expect(insights.inProgress).toBe(1);
    expect(insights.unwatched).toBe(1);
    expect(insights.watchedEpisodes).toBe(10);
    expect(insights.releasedEpisodes).toBe(28);
    expect(insights.episodeProgressRate).toBe(36);
  });

  it("summarizes mix, ratings, and recent activity", () => {
    const insights = buildLibraryInsights(titles, new Date("2026-09-25T00:00:00Z"));
    expect(insights.shows).toBe(2);
    expect(insights.movies).toBe(1);
    expect(insights.anime).toBe(1);
    expect(insights.averageRating).toBe(9);
    expect(insights.recentCount).toBe(2);
    expect(insights.topRated[0].title).toBe("Complete Show");
  });
  it("lets a manual Paused or Dropped choice override inferred watch state", () => {
    const insights = buildLibraryInsights(titles, new Date("2026-09-25T00:00:00Z"),
      new Map([["1", "paused"], ["2", "dropped"]]));
    expect(insights.paused).toBe(1);
    expect(insights.dropped).toBe(1);
    expect(insights.inProgress).toBe(0);
    expect(insights.completed).toBe(1);
  });
});