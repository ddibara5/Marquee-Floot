import { getTitleProgressSummary } from "./getTitleProgressSummary";
import type { Title } from "./Title";

describe("getTitleProgressSummary", () => {
  it("derives in-progress series state", () => {
    const title: Title = { id: "1", title: "Test", type: "show", watchedEpisodes: 3, releasedEpisodes: 10 };
    expect(getTitleProgressSummary(title)).toEqual({
      watched: 3,
      released: 10,
      remaining: 7,
      percent: 30,
      status: "in-progress",
      statusLabel: "In progress",
    });
  });

  it("distinguishes caught-up ongoing shows from completed ended shows", () => {
    const title: Title = { id: "1", title: "Test", type: "show", watchedEpisodes: 12, releasedEpisodes: 12 };
    expect(getTitleProgressSummary(title).status).toBe("caught-up");
    expect(getTitleProgressSummary(title).remaining).toBe(0);
    expect(getTitleProgressSummary({ ...title, tmdbStatus: "Returning Series" }).statusLabel).toBe("Caught up");
    expect(getTitleProgressSummary({ ...title, tmdbStatus: "Ended" }).status).toBe("complete");
  });

  it("derives movie state from watch date", () => {
    const watched: Title = { id: "1", title: "Movie", type: "movie", lastWatched: "2026-09-20T00:00:00Z" };
    const unwatched: Title = { id: "2", title: "Movie 2", type: "movie" };
    expect(getTitleProgressSummary(watched).status).toBe("complete");
    expect(getTitleProgressSummary(unwatched).status).toBe("unwatched");
  });
});