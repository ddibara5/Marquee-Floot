import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { schema, type OutputType } from "./episode-catalog_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { session } = await getServerUserSession(request);
    const url = new URL(request.url);
    const input = schema.parse(Object.fromEntries(url.searchParams));
    const mapping = await db.selectFrom("marqueeTmdbMappings").select(["tmdbId", "mediaType"])
      .where("titleId", "=", input.titleId).executeTakeFirst();
    if (!mapping || mapping.mediaType !== "tv") return new Response(superjson.stringify({
      overview: null, stillPath: null, runtimeMinutes: null,
    } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    const token = process.env.TMDB_API_TOKEN;
    if (!token) throw new Error("Episode information is unavailable");
    const result = await fetch(`https://api.themoviedb.org/3/tv/${mapping.tmdbId}/season/${input.season}/episode/${input.episode}?language=en-US`, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    });
    if (!result.ok) throw new Error("Episode information is unavailable");
    const episode = await result.json() as { overview?: string; still_path?: string; runtime?: number };
    const output = new Response(superjson.stringify({
      overview: episode.overview || null, stillPath: episode.still_path || null,
      runtimeMinutes: episode.runtime || null,
    } satisfies OutputType), { headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=3600" } });
    await setServerSession(output, { id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime() });
    return output;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Episode information is unavailable",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500,
      headers: { "Content-Type": "application/json" } });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "episode-catalog_GET.ts", true);
