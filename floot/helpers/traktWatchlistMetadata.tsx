type Kind = "movie" | "show";
type Details = {
  id: number;
  poster_path?: string | null;
  overview?: string | null;
  status?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  genres?: Array<{ id: number }>;
  origin_country?: string[];
  original_language?: string;
};

const DAY = 86_400_000;

export function shouldRefreshWatchlistMetadata(
  existing: { tmdbId: number | null; posterPath: string | null; metadataCheckedAt: Date | null } | undefined,
  tmdbId: number | undefined,
  now: Date
) {
  if (!tmdbId || !Number.isInteger(tmdbId) || tmdbId <= 0) return false;
  if (!existing || existing.tmdbId !== tmdbId || !existing.metadataCheckedAt) return true;
  return now.getTime() - existing.metadataCheckedAt.getTime() >=
    (existing.posterPath ? 30 : 7) * DAY;
}

export async function fetchTraktWatchlistMetadata(kind: Kind, tmdbId: number, sourceYear: number | null) {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB credential is not connected");
  const response = await fetch(
    `https://api.themoviedb.org/3/${kind === "show" ? "tv" : "movie"}/${tmdbId}?language=en-US`,
    { headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      signal: AbortSignal.timeout(12000) }
  );
  if (!response.ok) throw new Error("TMDB HTTP " + response.status);
  const details = await response.json() as Details;
  if (details.id !== tmdbId) throw new Error("TMDB identity mismatch");
  const rawDate = kind === "show" ? details.first_air_date : details.release_date;
  const validDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const year = validDate ? Number(validDate.slice(0, 4)) : null;
  if (sourceYear && year && Math.abs(sourceYear - year) > 1)
    throw new Error("TMDB release year mismatch");
  const isAnimation = details.genres?.some(genre => genre.id === 16) ?? false;
  return {
    posterPath: details.poster_path || null,
    overview: details.overview?.trim() || null,
    releaseDate: validDate ? new Date(validDate + "T12:00:00Z") : null,
    catalogStatus: details.status || null,
    isAnime: isAnimation && (kind === "show"
      ? details.origin_country?.includes("JP") === true
      : details.original_language === "ja"),
    metadataCheckedAt: new Date(),
  };
}