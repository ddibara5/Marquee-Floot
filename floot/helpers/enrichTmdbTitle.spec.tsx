import { previewTraktTmdbTitle } from "./enrichTmdbTitle";

describe("Trakt TMDB discovery guard", () => {
  const previous = process.env.TMDB_API_TOKEN;
  afterEach(() => {
    if (previous === undefined) delete (process.env as Record<string, string | undefined>).TMDB_API_TOKEN;
    else process.env.TMDB_API_TOKEN = previous;
  });

  const mockDetails = (name: string, year: string, genreIds: number[] = []) => {
    process.env.TMDB_API_TOKEN = "test-token";
    spyOn(globalThis, "fetch").and.resolveTo(
      new Response(JSON.stringify({
        id: 97546, name, first_air_date: year + "-08-14",
        genres: genreIds.map((id) => ({ id })),
      }), { status: 200 })
    );
  };

  it("accepts an exact non-animation show with matching year and supplied ID", async () => {
    mockDetails("Ted Lasso", "2020");
    const preview = await previewTraktTmdbTitle("show", 97546, "Ted Lasso", 2020);
    expect(preview?.tmdbId).toBe(97546);
  });

  it("leaves a year conflict unresolved", async () => {
    mockDetails("Ted Lasso", "2021");
    expect(await previewTraktTmdbTitle("show", 97546, "Ted Lasso", 2020))
      .toBeNull();
  });

  // Dave, October 12, 2026: anime watched outside Crunchyroll (for example PLUTO on Netflix) is added from Trakt.
  it("accepts exact animation and marks it as anime", async () => {
    mockDetails("Pluto", "2023", [16]);
    const preview = await previewTraktTmdbTitle("show", 97546, "PLUTO", 2023);
    expect(preview?.tmdbId).toBe(97546);
    expect(preview?.isAnimation).toBeTrue();
  });

  it("marks non-animation as not anime", async () => {
    mockDetails("Ted Lasso", "2020");
    expect((await previewTraktTmdbTitle("show", 97546, "Ted Lasso", 2020))?.isAnimation).toBeFalse();
  });

  it("rejects a different title even if the year agrees", async () => {
    mockDetails("Another Show", "2020");
    expect(await previewTraktTmdbTitle("show", 97546, "Ted Lasso", 2020))
      .toBeNull();
  });
});
