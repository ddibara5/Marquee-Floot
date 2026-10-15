import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { OutputType } from "./personal-state_GET.schema";

async function handleRequest(request: Request) {
  try {
    const {user, session} = await getServerUserSession(request);
    const [watch, rating, mappings, localWatch] = await Promise.all([
      db.selectFrom("marqueeTraktWatchlist").selectAll().where("userId","=",user.id)
        .where("active","=",true).orderBy("listedAt","desc").execute(),
      db.selectFrom("marqueeTraktRatings").selectAll().where("userId","=",user.id)
        .where("rating","is not",null).orderBy("ratedAt","desc").execute(),
      db.selectFrom("marqueeTraktMappings").select(["titleId","entityType","traktId"])
        .where("entityType","in",["movie","show"])
        .where("titleId","is not",null).execute(),
      db.selectFrom("marqueeLegacyWatchlist").select(["sourceId","titleId","addedAt"])
        .where("userId","=",user.id).where("source","=","manual").execute(),
    ]);
    const titleIds = [...new Set([
      ...[...watch, ...rating].map(row => row.titleId).filter((id): id is number => id !== null),
      ...localWatch.map(row => row.titleId),
    ])];
    const titles = titleIds.length ? await db.selectFrom("marqueeTitles")
      .select(["id","displayTitle","releaseYear","mediaType","tmdbPosterPath","overview","tmdbStatus","isAnime"])
      .where("id","in",titleIds).execute() : [];
    const titleById = new Map(titles.map(title => [title.id, title]));
    const metadata = (titleId: number | null) => {
      const title = titleId === null ? undefined : titleById.get(titleId);
      return {
        posterPath: title?.tmdbPosterPath ?? null,
        overview: title?.overview ?? null,
        catalogStatus: title?.tmdbStatus ?? null,
        isAnime: title?.isAnime ?? false,
      };
    };
    const payload: OutputType = {
      watchlist: [...watch.map(row => ({
        id:row.id, titleId:row.titleId, mediaType:row.mediaType,
        traktId:row.traktId, tmdbId:row.tmdbId, source:"trakt" as const, title:row.sourceTitle, year:row.sourceYear,
        pendingAction:row.pendingAction, activityAt:row.listedAt,
        ...metadata(row.titleId),
        posterPath:metadata(row.titleId).posterPath ?? row.posterPath,
        overview:metadata(row.titleId).overview ?? row.overview,
        catalogStatus:metadata(row.titleId).catalogStatus ?? row.catalogStatus,
        isAnime:metadata(row.titleId).isAnime || row.isAnime === true,
        releaseDate:row.releaseDate,
      })), ...localWatch.filter(row => !watch.some(remote => remote.titleId === row.titleId))
        .filter(row => titleById.has(row.titleId)).map(row => {
          const title = titleById.get(row.titleId)!;
          return {
            id:row.sourceId, titleId:row.titleId,
            mediaType:title.mediaType === "movie" ? "movie" : "show",
            traktId:"local:" + row.titleId, tmdbId:null, source:"local" as const,
            title:title.displayTitle, year:title.releaseYear,
            pendingAction:null, activityAt:row.addedAt,
            ...metadata(row.titleId),
          };
        })],
      ratings: rating.map(row => ({
        id:row.id, titleId:row.titleId, mediaType:row.mediaType,
        traktId:row.traktId, title:row.sourceTitle, year:row.sourceYear,
        rating:row.rating, tasteEligible:row.tasteEligible,
        pendingAction:row.pendingAction, activityAt:row.ratedAt,
        ...metadata(row.titleId),
      })),
      mappings:mappings.filter(row => row.titleId !== null).map(row => ({
        titleId:row.titleId!, mediaType:row.entityType, traktId:row.traktId,
      })),
    };
    const response = new Response(superjson.stringify(payload), {
      headers:{"Content-Type":"application/json"},
    });
    await setServerSession(response,{
      id:session.id, createdAt:session.createdAt,
      lastAccessed:session.lastAccessed.getTime(),
    });
    return response;
  } catch(error) {
    return new Response(superjson.stringify({
      error:error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to load Trakt data",
    }),{status:error instanceof NotAuthenticatedError ? 401 : 500,
      headers:{"Content-Type":"application/json"}});
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "personal-state_GET.ts", true);
