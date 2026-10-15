import { refreshTmdbMetadata } from "./refreshTmdbMetadata";
import { refreshShowCatalogs } from "./refreshShowCatalogs";

export async function refreshTmdbDaily() {
  const result = await refreshTmdbMetadata(25);
  if (result.failed.length) console.error("TMDB metadata refresh:", result.failed);
  // Catalog refresh runs after metadata so a metadata failure never blocks honest totals, and vice versa.
  try {
    const catalogs = await refreshShowCatalogs();
    console.log("Marquee catalog refresh", JSON.stringify(catalogs));
    if (catalogs.failed.length) console.error("Marquee catalog refresh failed:", catalogs.failed);
  } catch (error) {
    console.error("Marquee catalog refresh stopped:", error instanceof Error ? error.message : error);
  }
}
