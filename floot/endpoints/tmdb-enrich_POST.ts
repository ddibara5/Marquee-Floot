import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import {
  applyTmdbEnrichment,
  previewTmdbMatches,
} from "../helpers/enrichTmdbTitle";
import { schema, type OutputType } from "./tmdb-enrich_POST.schema";

async function handleRequest(request: Request) {
  try {
    const { session } = await getServerUserSession(request);

    const input = schema.parse(superjson.parse(await request.text()));
    const results = input.apply
      ? await applyTmdbEnrichment(input.titleIds)
      : await previewTmdbMatches(input.titleIds);

    const payload: OutputType = {
      mode: input.apply ? "apply" : "preview",
      results,
    };
    const response = new Response(superjson.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });

    await setServerSession(response, {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });

    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("TMDB enrichment error:", error);
    return new Response(
      superjson.stringify({
        error: error instanceof Error ? error.message : "TMDB enrichment failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "tmdb-enrich_POST.ts", true);
