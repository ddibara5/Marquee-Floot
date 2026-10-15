import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { OutputType } from "./titles_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { session } = await getServerUserSession(request);
    const titles = await db
      .selectFrom("marqueeTitles")
      .leftJoin("marqueeTitleAliases as alias", "alias.duplicateTitleId", "marqueeTitles.id")
      .selectAll("marqueeTitles")
      .where("alias.duplicateTitleId", "is", null)
      .orderBy("marqueeTitles.lastWatchedAt", "desc")
      .orderBy("displayTitle", "asc")
      .execute();

    const response = new Response(
      superjson.stringify({ titles } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } }
    );

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
    console.error("Titles load error:", error);
    return new Response(superjson.stringify({ error: "Unable to load titles" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "titles_GET.ts", true);
