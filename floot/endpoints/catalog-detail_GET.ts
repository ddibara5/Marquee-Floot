import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { schema, type CatalogDetail, type OutputType } from "./catalog-detail_GET.schema";

type Named = { name: string };
type TmdbDetail = {
  genres?: Named[]; runtime?: number; episode_run_time?: number[];
  release_date?: string; first_air_date?: string;
  credits?: { cast?: Array<{ name: string }>; crew?: Array<{ name: string; job: string }> };
  created_by?: Named[]; production_companies?: Named[]; networks?: Named[];
};
async function handleRequest(request: Request) {
  try {
    const { session } = await getServerUserSession(request);
    const { titleId } = schema.parse({ titleId: new URL(request.url).searchParams.get("titleId") });
    const mapping = await db.selectFrom("marqueeTmdbMappings")
      .select(["tmdbId", "mediaType"]).where("titleId", "=", titleId).executeTakeFirst();
    if (!mapping) return new Response(superjson.stringify({ detail: null } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
    const token = process.env.TMDB_API_TOKEN;
    if (!token) throw new Error("Catalog details unavailable");
    const media = mapping.mediaType === "movie" ? "movie" : "tv";
    const response = await fetch(`https://api.themoviedb.org/3/${media}/${mapping.tmdbId}?append_to_response=credits&language=en-US`, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catalog details unavailable");
    const data = await response.json() as TmdbDetail;
    const unique = (rows: Named[] = []) => [...new Set(rows.map(row => row.name).filter(Boolean))];
    const detail: CatalogDetail = {
      genres: unique(data.genres),
      runtimeMinutes: data.runtime ?? data.episode_run_time?.find(value => value > 0) ?? null,
      released: data.release_date || data.first_air_date || null,
      cast: unique((data.credits?.cast ?? []).slice(0, 5)),
      creators: unique(data.created_by?.length ? data.created_by :
        (data.credits?.crew ?? []).filter(row => ["Director", "Creator"].includes(row.job)).slice(0, 3)),
      studios: unique(data.production_companies).slice(0, 3),
      networks: unique(data.networks).slice(0, 3),
      website: `https://www.themoviedb.org/${media}/${mapping.tmdbId}`,
    };
    const output = new Response(superjson.stringify({ detail } satisfies OutputType), {
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=3600" },
    });
    await setServerSession(output, {
      id: session.id, createdAt: session.createdAt, lastAccessed: session.lastAccessed.getTime(),
    });
    return output;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Catalog details unavailable",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500,
      headers: { "Content-Type": "application/json" } });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "catalog-detail_GET.ts", true);
