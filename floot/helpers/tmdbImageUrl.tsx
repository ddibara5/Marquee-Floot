export const tmdbImageUrl = (
  path: string | undefined,
  size: "w185" | "w342" | "w500" | "w780" = "w342"
) => path ? "https://image.tmdb.org/t/p/" + size + path : undefined;