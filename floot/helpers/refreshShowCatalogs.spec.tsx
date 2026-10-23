import { selectCatalogRefresh, toCandidate, type RefreshCandidate } from "./refreshShowCatalogs";

describe("toCandidate", () => {
  it("reads the camelCase columns db returns, so a real row can be picked", () => {
    const row = { titleId: 194, title: "Pantheon", tmdbId: 195339, tmdbStatus: "Canceled", crunchyrollLinked: false,
      catalogUpdatedAt: "2026-09-25T18:19:51Z", lastWatchedAt: "2025-06-29T23:02:00Z",
      missingEpisodeTmdb: true, unnumberedSeasons: false };
    const candidate = toCandidate(row);
    expect(candidate).toEqual(jasmine.objectContaining({ titleId: 194, tmdbId: 195339, crunchyrollLinked: false, missingEpisodeTmdb: true }));
    expect(selectCatalogRefresh([candidate], new Date("2026-10-23T10:30:00Z")).map((s) => s.title)).toEqual(["Pantheon"]);
  });
});

const now = new Date("2026-10-12T14:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 86_400_000);
const show = (over: Partial<RefreshCandidate>): RefreshCandidate => ({
  titleId: 1, title: "Show", tmdbId: 100, tmdbStatus: "Returning Series",
  crunchyrollLinked: false, catalogUpdatedAt: day(17), lastWatchedAt: day(5), ...over,
});

describe("selectCatalogRefresh", () => {
  it("picks current shows with a stale catalog, most recently watched first", () => {
    const picked = selectCatalogRefresh([
      show({ titleId: 1, title: "Old watch", lastWatchedAt: day(200) }),
      show({ titleId: 2, title: "Ted Lasso", lastWatchedAt: day(4) }),
      show({ titleId: 3, title: "Never watched", lastWatchedAt: null }),
    ], now);
    expect(picked.map((s) => s.title)).toEqual(["Ted Lasso", "Old watch", "Never watched"]);
  });

  it("skips ended, Crunchyroll-linked, catalog-less and recently refreshed shows", () => {
    const picked = selectCatalogRefresh([
      show({ titleId: 1, tmdbStatus: "Ended" }),
      show({ titleId: 2, crunchyrollLinked: true }),
      show({ titleId: 3, catalogUpdatedAt: null }),
      show({ titleId: 4, catalogUpdatedAt: day(1) }),
      show({ titleId: 5, tmdbId: 0 }),
    ], now);
    expect(picked).toEqual([]);
  });

  it("respects the daily limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => show({ titleId: i + 1 }));
    expect(selectCatalogRefresh(rows, now, 12).length).toBe(12);
  });

  it("backfills ended or canceled shows missing episode TMDB data in their own slots", () => {
    const current = Array.from({ length: 20 }, (_, i) => show({ titleId: i + 1 }));
    const picked = selectCatalogRefresh([
      ...current,
      show({ titleId: 101, title: "Pantheon", tmdbStatus: "Canceled", missingEpisodeTmdb: true, lastWatchedAt: day(480) }),
      show({ titleId: 102, title: "Done", tmdbStatus: "Ended", missingEpisodeTmdb: false }),
      show({ titleId: 103, title: "Unnumbered", tmdbStatus: "Ended", missingEpisodeTmdb: true, unnumberedSeasons: true }),
      show({ titleId: 104, title: "Crunchy", tmdbStatus: "Ended", missingEpisodeTmdb: true, crunchyrollLinked: true }),
      show({ titleId: 105, title: "Fresh", tmdbStatus: "Ended", missingEpisodeTmdb: true, catalogUpdatedAt: day(1) }),
      show({ titleId: 106, title: "Recent", tmdbStatus: "Ended", missingEpisodeTmdb: true, lastWatchedAt: day(2) }),
    ], now, 12, 3, 8);
    expect(picked.length).toBe(14);
    expect(picked.slice(12).map((s) => s.title)).toEqual(["Recent", "Pantheon"]);
  });

  it("respects the backfill limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => show({ titleId: i + 1, tmdbStatus: "Ended", missingEpisodeTmdb: true }));
    expect(selectCatalogRefresh(rows, now, 12, 3, 8).length).toBe(8);
  });
});
