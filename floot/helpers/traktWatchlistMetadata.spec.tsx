import { shouldRefreshWatchlistMetadata } from "./traktWatchlistMetadata";

describe("Watch List artwork refresh schedule", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  const checked = (daysAgo:number, posterPath:string|null) => ({
    tmdbId:196322, posterPath,
    metadataCheckedAt:new Date(now.getTime() - daysAgo * 86_400_000),
  });

  it("fetches art for a newly synced Trakt item and when its TMDB identity changes", () => {
    expect(shouldRefreshWatchlistMetadata(undefined,196322,now)).toBe(true);
    expect(shouldRefreshWatchlistMetadata({...checked(1,"/old.jpg"),tmdbId:5},196322,now)).toBe(true);
    expect(shouldRefreshWatchlistMetadata(checked(1,null),undefined,now)).toBe(false);
  });

  it("retries missing posters sooner and refreshes existing posters monthly", () => {
    expect(shouldRefreshWatchlistMetadata(checked(6,null),196322,now)).toBe(false);
    expect(shouldRefreshWatchlistMetadata(checked(7,null),196322,now)).toBe(true);
    expect(shouldRefreshWatchlistMetadata(checked(29,"/poster.jpg"),196322,now)).toBe(false);
    expect(shouldRefreshWatchlistMetadata(checked(30,"/poster.jpg"),196322,now)).toBe(true);
  });
});
