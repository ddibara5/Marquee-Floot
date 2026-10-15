import { filterAndSortTitles } from "./filterAndSortTitles";
import type { Title } from "./Title";

describe("filterAndSortTitles", () => {
  const titles: Title[] = [
    { id: "1", title: "Current Show", type: "show", watchedEpisodes: 2, releasedEpisodes: 8, lastWatched: "2026-09-20T00:00:00Z" },
    { id: "2", title: "Complete Show", type: "show", watchedEpisodes: 8, releasedEpisodes: 8, lastWatched: "2026-09-10T00:00:00Z", score: 7 },
    { id: "3", title: "Unwatched Movie", type: "movie", year: 2026 },
    { id: "4", title: "Watched Movie", type: "movie", year: 2020, lastWatched: "2026-09-22T00:00:00Z", score: 9 },
    { id: "5", title: "Anime Show", type: "show", anime: true, watchedEpisodes: 0, releasedEpisodes: 12 },
  ];

  const defaults = { filter: "all" as const, watchState: "all" as const, sort: "recent" as const, query: "" };

  it("filters anime separately from standard shows", () => {
    expect(filterAndSortTitles(titles, { ...defaults, filter: "anime" }).map(t => t.title)).toEqual(["Anime Show"]);
    expect(filterAndSortTitles(titles, { ...defaults, filter: "shows" }).map(t => t.title)).not.toContain("Anime Show");
  });

  it("filters by watch state", () => {
    expect(filterAndSortTitles(titles, { ...defaults, watchState: "in-progress" }).map(t => t.title)).toEqual(["Current Show"]);
    expect(filterAndSortTitles(titles, { ...defaults, watchState: "completed" }).map(t => t.title)).toEqual(["Watched Movie", "Complete Show"]);
    expect(filterAndSortTitles(titles, { ...defaults, watchState: "unwatched" }).map(t => t.title)).toEqual(["Anime Show", "Unwatched Movie"]);
  });

  it("searches titles case-insensitively", () => {
    expect(filterAndSortTitles(titles, { ...defaults, query: "MOVIE" }).map(t => t.title)).toEqual(["Watched Movie", "Unwatched Movie"]);
  });

  it("sorts by rating and title", () => {
    expect(filterAndSortTitles(titles, { ...defaults, sort: "rating" })[0].title).toBe("Watched Movie");
    expect(filterAndSortTitles(titles, { ...defaults, sort: "title" })[0].title).toBe("Anime Show");
  });
});