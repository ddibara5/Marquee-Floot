import { describeGroup, groupActivity } from "./groupActivity";
import type { HistoryEvent } from "../endpoints/watch-history_GET.schema";

const ep = (eventId: number, titleId: number, title: string, watchedAt: string, season: number, episode: number, episodeTitle: string | null = null): HistoryEvent => ({
  kind: "episode", eventId, titleId, title, watchedAt: new Date(watchedAt), posterPath: null, isAnime: false,
  seasonNumber: season, episodeNumber: episode, episodeTitle,
});
const movie = (eventId: number, titleId: number, title: string, watchedAt: string): HistoryEvent => ({
  kind: "movie", eventId, titleId, title, watchedAt: new Date(watchedAt), posterPath: null, isAnime: false,
  seasonNumber: null, episodeNumber: null, episodeTitle: null,
});

// Friday, October 16, 2026, evening local time. Weeks start on Monday (Oct 12).
const now = new Date(2026, 9, 16, 21, 0);
const at = (day: number, month = 10, hour = 20) => new Date(2026, month - 1, day, hour).toISOString();

describe("groupActivity", () => {
  const events = [ // newest first, as the endpoint returns them
    ep(9, 1, "PLUTO", at(16), 1, 8), ep(8, 1, "PLUTO", at(15), 1, 7), ep(7, 1, "PLUTO", at(14), 1, 6),
    ep(6, 1, "PLUTO", at(13), 1, 5), ep(5, 1, "PLUTO", at(12), 1, 4),
    ep(4, 2, "Last Seen", at(8), 1, 6), ep(3, 3, "Ted Lasso", at(7), 4, 10),
    ep(2, 1, "PLUTO", at(6), 1, 3), movie(1, 4, "The Odyssey", at(20, 9)),
  ];

  it("puts watches into This week, Last week, then months", () => {
    const periods = groupActivity(events, now);
    expect(periods.map(p => p.label)).toEqual(["This week", "Last week", "September"]);
    expect(periods.map(p => p.count)).toEqual([5, 3, 1]);
  });

  it("merges one title's watches within a period, ordered by its latest watch", () => {
    const [thisWeek, lastWeek] = groupActivity(events, now);
    expect(thisWeek.groups.map(g => [g.title, g.events.length])).toEqual([["PLUTO", 5]]);
    expect(lastWeek.groups.map(g => [g.title, g.events.length])).toEqual([["Last Seen", 1], ["Ted Lasso", 1], ["PLUTO", 1]]);
  });

  it("gives every group a key that stays the same as more watches load", () => {
    const keys = groupActivity(events, now).flatMap(p => p.groups.map(g => g.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(groupActivity(events.slice(0, 5), now)[0].groups[0].key).toBe(keys[0]);
  });

  it("names the year for months outside the current year and skips undated events", () => {
    const periods = groupActivity([movie(1, 4, "Dune", "2025-12-30T20:00:00Z"), movie(2, 5, "Bad", "not a date")], now);
    expect(periods.map(p => p.label)).toEqual(["December 2025"]);
  });
});

describe("describeGroup", () => {
  it("summarises a run of episodes with the episode and date range", () => {
    const [thisWeek] = groupActivity([ep(9, 1, "PLUTO", at(16), 1, 8), ep(5, 1, "PLUTO", at(12), 1, 4)], now);
    expect(describeGroup(thisWeek.groups[0])).toBe("2 episodes · S1 E4 to E8 · Oct 12 to 16");
  });
  it("spans seasons and months when it has to", () => {
    const [period] = groupActivity([ep(2, 1, "Show", at(1, 11), 2, 1), ep(1, 1, "Show", at(30, 10), 1, 9)], new Date(2026, 10, 2, 12));
    expect(describeGroup(period.groups[0])).toBe("2 episodes · S1 E9 to S2 E1 · Oct 30 to Nov 1");
  });
  it("shows one episode with its name and day, and movies by count", () => {
    const [period] = groupActivity([ep(4, 2, "Last Seen", at(15), 1, 6, "Homecoming")], now);
    expect(describeGroup(period.groups[0])).toBe("S1 E6 · Homecoming · Oct 15");
    const [movies] = groupActivity([movie(2, 4, "Dune", at(16)), movie(1, 4, "Dune", at(16, 10, 9))], now);
    expect(describeGroup(movies.groups[0])).toBe("Watched 2 times · Oct 16");
  });
});
