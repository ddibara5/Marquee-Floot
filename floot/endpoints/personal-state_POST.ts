import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { getTraktAccessToken } from "../helpers/traktSync";
import { syncTraktPersonalState } from "../helpers/traktPersonalSync";
import { wholeRating } from "../helpers/titleRatings";
import { schema } from "./personal-state_POST.schema";

async function handleRequest(request:Request) {
  try {
    const {user,session} = await getServerUserSession(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const table = input.kind === "watchlist"
      ? "marqueeTraktWatchlist" as const : "marqueeTraktRatings" as const;
    const mapping = await db.selectFrom("marqueeTraktMappings")
      .select(["titleId","tmdbId"])
      .where("entityType","=",input.mediaType)
      .where("traktId","=",input.traktId).executeTakeFirst();
    const existing = input.kind === "watchlist"
      ? await db.selectFrom("marqueeTraktWatchlist").selectAll()
        .where("userId","=",user.id).where("mediaType","=",input.mediaType)
        .where("traktId","=",input.traktId).executeTakeFirst()
      : await db.selectFrom("marqueeTraktRatings").selectAll()
        .where("userId","=",user.id).where("mediaType","=",input.mediaType)
        .where("traktId","=",input.traktId).executeTakeFirst();
    if (!mapping?.titleId && !existing)
      return new Response(superjson.stringify({error:"Title needs a verified Trakt mapping"}),{status:400});
    const title = mapping?.titleId ? await db.selectFrom("marqueeTitles")
      .select(["displayTitle","releaseYear"]).where("id","=",mapping.titleId)
      .executeTakeFirst() : null;
    const sourceTitle = title?.displayTitle ?? existing?.sourceTitle;
    if (!sourceTitle) throw new Error("Missing title");
    const common = {
      userId:user.id, mediaType:input.mediaType, traktId:input.traktId,
      titleId:mapping?.titleId ?? existing?.titleId ?? null,
      tmdbId:mapping?.tmdbId ?? existing?.tmdbId ?? null,
      sourceTitle, sourceYear:title?.releaseYear ?? existing?.sourceYear ?? null,
      updatedAt:new Date(),
    };
    if (input.kind === "watchlist") {
      await db.insertInto("marqueeTraktWatchlist").values({
        ...common, active:input.action === "add",
        pendingAction:input.action,
        listedAt:input.action === "add" ? new Date() : null,
      }).onConflict(oc => oc.columns(["userId","mediaType","traktId"])
        .doUpdateSet({
          active:input.action === "add",pendingAction:input.action,
          updatedAt:common.updatedAt,
        })).execute();
      if (mapping?.titleId) await db.deleteFrom("marqueeLegacyWatchlist")
        .where("userId","=",user.id).where("titleId","=",mapping.titleId)
        .where("source","=","manual").execute();
    } else {
      // Trakt keeps the whole number; the half-point score is Marquee's own (AF-20261023-06).
      const rating = input.action === "set" ? wholeRating(input.rating!) : null;
      const ratingScore = input.action === "set" ? input.rating! : null;
      await db.insertInto("marqueeTraktRatings").values({
        ...common, rating, ratingScore,
        ratedAt:input.action === "set" ? new Date() : null,
        pendingAction:input.action, tasteEligible:true,
      }).onConflict(oc => oc.columns(["userId","mediaType","traktId"])
        .doUpdateSet({
          rating, ratingScore,
          ratedAt:input.action === "set" ? new Date() : null,
          pendingAction:input.action,tasteEligible:true,updatedAt:common.updatedAt,
        })).execute();
    }
    let synced = false;
    let message = "Saved. Trakt sync will retry on the next sync.";
    try {
      const token = await getTraktAccessToken(user.id);
      await syncTraktPersonalState(user.id,token);
      synced = true;
      message = "Saved and synced with Trakt.";
    } catch(error) {
      console.error("Trakt personal edit queued for retry:",error);
    }
    const response = new Response(superjson.stringify({saved:true,synced,message}),{
      headers:{"Content-Type":"application/json"},
    });
    await setServerSession(response,{
      id:session.id,createdAt:session.createdAt,lastAccessed:session.lastAccessed.getTime(),
    });
    return response;
  } catch(error) {
    return new Response(superjson.stringify({
      error:error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to save Trakt change",
    }),{status:error instanceof NotAuthenticatedError ? 401 : 500,
      headers:{"Content-Type":"application/json"}});
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "personal-state_POST.ts", true);
