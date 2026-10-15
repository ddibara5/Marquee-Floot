import { db } from "./db";

type SearchCandidate = {
  id: number; name?: string; title?: string;
  original_name?: string; original_title?: string;
  first_air_date?: string; release_date?: string;
  genre_ids?: number[];
};
// Individually reviewed alternate titles/years from TMDB; keep separate from unattended matching.
const reviewed: Record<string, { id: number; media: "tv" | "movie"; year: number; name: string }> = {
  "Demon Slayer: Infinity Castle": { id: 1311031, media: "movie", year: 2025, name: "Demon Slayer: Kimetsu no Yaiba Infinity Castle" },
  "Black Butler: Book of the Atlantic": { id: 432131, media: "movie", year: 2017, name: "Black Butler: Book of the Atlantic" },
  "Yu Yu Hakusho": { id: 30669, media: "tv", year: 1992, name: "Yu Yu Hakusho" },
  "Naruto Shippuden": { id: 31910, media: "tv", year: 2007, name: "Naruto Shippūden" },
  "Michiko to Hatchin": { id: 21311, media: "tv", year: 2008, name: "Michiko & Hatchin" },
  "Re:Zero": { id: 65942, media: "tv", year: 2016, name: "Re:ZERO -Starting Life in Another World-" },
  "Code Geass": { id: 31724, media: "tv", year: 2006, name: "Code Geass: Lelouch of the Rebellion" },
};
export type AnimeMatch = {
  titleId: number; source: string; year: number | null;
  candidateId: number | null; candidate: string | null;
  reason: string; applied: boolean;
};
const normalize = (s: string) => s.toLowerCase().normalize("NFKD")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
const yearFrom = (date?: string) => date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null;

export async function matchAnimeTmdb(apply = false, limit = 60): Promise<AnimeMatch[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 60) throw new Error("Invalid anime limit");
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB credential is not connected");
  const rows = await db.selectFrom("marqueeTitles as title")
    .leftJoin("marqueeTmdbMappings as mapping", "mapping.titleId", "title.id")
    .select(["title.id", "title.displayTitle", "title.releaseYear", "title.mediaType"])
    .where("title.isAnime", "=", true).where("mapping.titleId", "is", null)
    .orderBy("title.id", "asc").limit(limit).execute();
  const results: AnimeMatch[] = [];
  for (const title of rows) {
    const inlineYear = title.displayTitle.match(/\s*\((\d{4})\)$/);
    const manual = reviewed[title.displayTitle];
    const year = title.releaseYear ?? (inlineYear ? Number(inlineYear[1]) : manual?.year ?? null);
    const searchName = inlineYear ? title.displayTitle.slice(0, inlineYear.index).trim() : title.displayTitle;
    if (manual) {
      try {
        const media = title.mediaType === "show" ? "tv" : "movie";
        if (manual.media !== media || (title.releaseYear && title.releaseYear !== manual.year))
          throw new Error("Reviewed type or year conflict");
        const response = await fetch(`https://api.themoviedb.org/3/${media}/${manual.id}?language=en-US`, {
          headers: { Authorization: "Bearer " + token, Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("TMDB HTTP " + response.status);
        const details = await response.json() as {
          id: number; name?: string; title?: string; first_air_date?: string;
          release_date?: string; genres?: Array<{ id: number }>;
        };
        const name = media === "tv" ? details.name : details.title;
        const actualYear = yearFrom(media === "tv" ? details.first_air_date : details.release_date);
        if (details.id !== manual.id || normalize(name ?? "") !== normalize(manual.name) ||
            actualYear !== manual.year || !details.genres?.some(g => g.id === 16))
          throw new Error("Reviewed TMDB identity changed");
        const assigned = await db.selectFrom("marqueeTmdbMappings")
          .select("titleId").where("mediaType", "=", media)
          .where("tmdbId", "=", manual.id).executeTakeFirst();
        if (assigned && assigned.titleId !== title.id)
          throw new Error("TMDB ID belongs to another library title");
        let applied = false;
        if (apply) {
          const inserted = await db.insertInto("marqueeTmdbMappings").values({
            titleId: title.id, tmdbId: manual.id, mediaType: media,
            matchedTitle: name ?? null, matchedYear: actualYear,
            matchMethod: "reviewed-anime-alias", confidence: 1,
          }).onConflict(oc => oc.column("titleId").doNothing())
            .returning("titleId").executeTakeFirst();
          applied = Boolean(inserted);
        }
        results.push({ titleId: title.id, source: title.displayTitle, year,
          candidateId: manual.id, candidate: name ?? null,
          reason: "Reviewed alternate title and year", applied });
      } catch (error) {
        results.push({ titleId: title.id, source: title.displayTitle, year,
          candidateId: null, candidate: null,
          reason: error instanceof Error ? error.message : "Reviewed lookup failed", applied: false });
      }
      continue;
    }
    if (!year) {
      results.push({ titleId: title.id, source: title.displayTitle, year,
        candidateId: null, candidate: null, reason: "Release year needs review", applied: false });
      continue;
    }
    const media = title.mediaType === "show" ? "tv" : "movie";
    const params = new URLSearchParams({ query: searchName, language: "en-US", include_adult: "false",
      [media === "tv" ? "first_air_date_year" : "year"]: String(year) });
    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/${media}?${params}`, {
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("TMDB HTTP " + response.status);
      const data = await response.json() as { results?: SearchCandidate[] };
      const exact = (data.results ?? []).filter(c => {
        const name = media === "tv" ? c.name : c.title;
        const original = media === "tv" ? c.original_name : c.original_title;
        const foundYear = yearFrom(media === "tv" ? c.first_air_date : c.release_date);
        return foundYear === year && c.genre_ids?.includes(16) &&
          (normalize(name ?? "") === normalize(searchName) ||
            normalize(original ?? "") === normalize(searchName));
      });
      const candidate = exact.length === 1 ? exact[0] : null;
      let reason = exact.length > 1 ? "Several exact animated matches" :
        !candidate ? "No exact animated title and year match" : "Exact animated title and year";
      if (candidate) {
        const assigned = await db.selectFrom("marqueeTmdbMappings")
          .select("titleId").where("mediaType", "=", media)
          .where("tmdbId", "=", candidate.id).executeTakeFirst();
        if (assigned && assigned.titleId !== title.id) reason = "TMDB ID belongs to another library title";
      }
      let applied = false;
      if (apply && candidate && reason === "Exact animated title and year") {
        const inserted = await db.insertInto("marqueeTmdbMappings").values({
          titleId: title.id, tmdbId: candidate.id, mediaType: media,
          matchedTitle: media === "tv" ? candidate.name ?? null : candidate.title ?? null,
          matchedYear: year, matchMethod: "exact-anime-title-year", confidence: 1,
        }).onConflict(oc => oc.column("titleId").doNothing())
          .returning("titleId").executeTakeFirst();
        applied = Boolean(inserted);
        if (!inserted) reason = "Mapping changed during matching";
      }
      results.push({ titleId: title.id, source: title.displayTitle, year,
        candidateId: candidate?.id ?? null,
        candidate: candidate ? (media === "tv" ? candidate.name ?? null : candidate.title ?? null) : null,
        reason, applied });
    } catch (error) {
      results.push({ titleId: title.id, source: title.displayTitle, year,
        candidateId: null, candidate: null,
        reason: error instanceof Error ? error.message : "TMDB search failed", applied: false });
    }
  }
  return results;
}
