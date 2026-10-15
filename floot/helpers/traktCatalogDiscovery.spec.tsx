import { planCatalogDiscovery, type CatalogLookups } from "./traktCatalogDiscovery";
import type { TraktHistoryItem } from "./traktApi";

const episode = (id: number, show: string, trakt: number, tmdb: number, season: number, number: number) =>
  ({ id, watched_at: "2026-10-03T00:00:00.000Z", type: "episode", action: "watch",
    show: { title: show, year: 2026, ids: { trakt, tmdb } }, episode: { season, number, title: "E", ids: {} } }) as unknown as TraktHistoryItem;
const movie = (id: number, title: string, trakt: number, tmdb: number) =>
  ({ id, watched_at: "2026-10-03T00:00:00.000Z", type: "movie", action: "watch",
    movie: { title, year: 2026, ids: { trakt, tmdb } } }) as unknown as TraktHistoryItem;

function lookups(over: Partial<CatalogLookups> = {}): CatalogLookups {
  return {
    isRecorded: async () => false,
    showTitle: async (item) => item.show?.ids.trakt === 157599 ? { titleId: 8, tmdbId: 95350, crunchyrollLinked: false } : null,
    movieTitle: async () => null,
    hasEpisode: async (_t, _s, e) => e <= 2,
    ...over,
  };
}

describe("planCatalogDiscovery", () => {
  it("refreshes a known show once when watched episodes are missing from its catalog", async () => {
    const gaps = await planCatalogDiscovery([
      episode(3, "Lanterns", 157599, 95350, 1, 3), episode(4, "Lanterns", 157599, 95350, 1, 4),
      episode(5, "Lanterns", 157599, 95350, 1, 5),
    ], [], lookups());
    expect(gaps).toEqual([{ kind: "missingEpisodes", titleId: 8, tmdbId: 95350, title: "Lanterns" }]);
  });

  it("adds an unknown show once and an unknown movie once", async () => {
    const gaps = await planCatalogDiscovery(
      [episode(10, "PLUTO", 202543, 91997, 1, 1), episode(11, "PLUTO", 202543, 91997, 1, 2)],
      [movie(20, "Sinners", 900, 1233413), movie(21, "Sinners", 900, 1233413)], lookups());
    expect(gaps.map((g) => [g.kind, g.title])).toEqual([["newTitle", "PLUTO"], ["newTitle", "Sinners"]]);
  });

  it("skips recorded history, episodes already in the catalog and excluded titles", async () => {
    const gaps = await planCatalogDiscovery([
      episode(1, "Lanterns", 157599, 95350, 1, 2),
      episode(3, "Lanterns", 157599, 95350, 1, 3),
      episode(30, "One Piece", 37696, 37854, 1, 1),
    ], [movie(20, "Known", 900, 1)], lookups({
      isRecorded: async (key) => key === "trakt:episode:3",
      movieTitle: async () => 44,
    }));
    expect(gaps).toEqual([]);
  });

  it("leaves Crunchyroll-linked titles and conflicting TMDB identities to the existing rules", async () => {
    const anime = await planCatalogDiscovery([episode(3, "Lanterns", 157599, 95350, 1, 3)], [],
      lookups({ showTitle: async () => ({ titleId: 8, tmdbId: 95350, crunchyrollLinked: true }) }));
    const conflict = await planCatalogDiscovery([episode(3, "Lanterns", 157599, 11111, 1, 3)], [], lookups());
    const unmapped = await planCatalogDiscovery([episode(3, "Lanterns", 157599, 95350, 1, 3)], [],
      lookups({ showTitle: async () => ({ titleId: 8, tmdbId: null, crunchyrollLinked: false }) }));
    expect([anime, conflict, unmapped]).toEqual([[], [], []]);
  });

  it("caps the number of catalog changes per run", async () => {
    const items = Array.from({ length: 15 }, (_, i) => episode(100 + i, "Show " + i, 5000 + i, 6000 + i, 1, 1));
    expect((await planCatalogDiscovery(items, [], lookups(), 10)).length).toBe(10);
  });
});
