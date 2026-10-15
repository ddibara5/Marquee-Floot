import { ingestionDb as db, inShadowTransaction } from "./marqueeIngestionScope";
import { fetchTraktWatchlistMetadata, shouldRefreshWatchlistMetadata } from "./traktWatchlistMetadata";

type Kind = "movie" | "show";
export type RemoteItem = {
  rating?: number;
  rated_at?: string;
  listed_at?: string;
  movie?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number } };
  show?: { title: string; year?: number; ids: { trakt?: number; tmdb?: number } };
};

const headers = (token: string) => ({
  Authorization: "Bearer " + token,
  "trakt-api-version": "2",
  "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
  "User-Agent": "MarqueeTraktSync/1.0 (github.com/ddibara5/marquee)",
  Accept: "application/json",
});

const fetchAll = async (token: string, path: string): Promise<RemoteItem[]> => {
  const all: RemoteItem[] = [];
  let pages = 1;
  let expected: number | null = null;
  for (let page = 1; page <= pages; page++) {
    const response = await fetch(
      "https://api.trakt.tv/sync/" + path + "?page=" + page + "&limit=100",
      { headers: headers(token) }
    );
    if (!response.ok) throw new Error("Trakt " + path + " fetch failed (" + response.status + ")");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid Trakt " + path + " snapshot");
    all.push(...rows);
    const count = Number(response.headers.get("x-pagination-page-count") ?? "1");
    if (!Number.isInteger(count) || count < 1 || count > 500)
      throw new Error("Invalid Trakt pagination for " + path);
    pages = count;
    const itemCount = response.headers.get("x-pagination-item-count");
    if (itemCount !== null) expected = Number(itemCount);
  }
  if (expected !== null && all.length !== expected)
    throw new Error("Incomplete Trakt " + path + " snapshot");
  return all;
};

const send = async (
  token: string, path: string, mediaType: Kind, traktId: string,
  rating?: number
) => {
  const media = mediaType === "movie" ? "movies" : "shows";
  const item = { ids: { trakt: Number(traktId) }, ...(rating ? { rating } : {}) };
  const response = await fetch("https://api.trakt.tv/sync/" + path, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ [media]: [item] }),
  });
  if (!response.ok) throw new Error("Trakt " + path + " write failed (" + response.status + ")");
  const body = await response.json();
  if (Array.isArray(body?.not_found?.[media]) && body.not_found[media].length)
    throw new Error("Trakt did not recognize " + mediaType + " " + traktId);
};

const findTitleId = async (kind: Kind, traktId: number, tmdbId?: number) => {
  const trakt = await db.selectFrom("marqueeTraktMappings")
    .select(["titleId", "tmdbId"]).where("entityType", "=", kind)
    .where("traktId", "=", String(traktId)).executeTakeFirst();
  if (trakt?.titleId) {
    if (tmdbId && trakt.tmdbId && trakt.tmdbId !== tmdbId) return null;
    return trakt.titleId;
  }
  if (!tmdbId) return null;
  const tmdb = await db.selectFrom("marqueeTmdbMappings")
    .select(["titleId"]).where("mediaType", "=", kind === "show" ? "tv" : "movie")
    .where("tmdbId", "=", tmdbId).executeTakeFirst();
  return tmdb?.titleId ?? null;
};

const validated = (rows: RemoteItem[], kind: Kind, path: string) => {
  const keys = new Set<string>();
  for (const row of rows) {
    const entity = kind === "movie" ? row.movie : row.show;
    if (!entity?.ids?.trakt || !entity.title)
      throw new Error("Invalid item in Trakt " + path + " snapshot");
    const id = String(entity.ids.trakt);
    if (keys.has(id)) throw new Error("Duplicate item in Trakt " + path + " snapshot");
    keys.add(id);
    if (path.startsWith("ratings/") &&
        (!Number.isInteger(row.rating) || row.rating! < 1 || row.rating! > 10 ||
          !row.rated_at || !Number.isFinite(new Date(row.rated_at).getTime())))
      throw new Error("Invalid rating in Trakt " + path + " snapshot");
  }
  return keys;
};

export const syncTraktPersonalState = async (userId: number, token: string, supplied?: {watchlist_movies:RemoteItem[];watchlist_shows:RemoteItem[];ratings_movies:RemoteItem[];ratings_shows:RemoteItem[]}) => {
  try {
    // Local intent wins while pending. A failed write remains queued for replay.
    const pendingWatch = await db.selectFrom("marqueeTraktWatchlist")
      .selectAll().where("userId", "=", userId)
      .where("pendingAction", "is not", null).execute();
    const pendingRatings = await db.selectFrom("marqueeTraktRatings")
      .selectAll().where("userId", "=", userId)
      .where("pendingAction", "is not", null).execute();
    for (const row of supplied ? [] : pendingWatch) {
      await send(token, row.pendingAction === "remove" ? "watchlist/remove" : "watchlist",
        row.mediaType as Kind, row.traktId);
    }
    for (const row of supplied ? [] : pendingRatings) {
      await send(token, row.pendingAction === "remove" ? "ratings/remove" : "ratings",
        row.mediaType as Kind, row.traktId, row.rating ?? undefined);
    }

    // Fetch all four complete snapshots before changing any local state.
    const [movies, shows, movieRatings, showRatings] = supplied ? [supplied.watchlist_movies,supplied.watchlist_shows,supplied.ratings_movies,supplied.ratings_shows] : await Promise.all([
      fetchAll(token, "watchlist/movies"),
      fetchAll(token, "watchlist/shows"),
      fetchAll(token, "ratings/movies"),
      fetchAll(token, "ratings/shows"),
    ]);
    const snapshots = [
      { kind: "movie" as Kind, path: "watchlist/movies", rows: movies },
      { kind: "show" as Kind, path: "watchlist/shows", rows: shows },
    ];
    const ratingSnapshots = [
      { kind: "movie" as Kind, path: "ratings/movies", rows: movieRatings },
      { kind: "show" as Kind, path: "ratings/shows", rows: showRatings },
    ];
    const watchKeys = snapshots.map(({rows,kind,path}) => validated(rows, kind, path));
    const ratingKeys = ratingSnapshots.map(({rows,kind,path}) => validated(rows, kind, path));

    // Never claim success or reconcile removals if an outbound edit isn't visible.
    for (const row of pendingWatch) {
      const keys = row.mediaType === "movie" ? watchKeys[0] : watchKeys[1];
      if (keys.has(row.traktId) !== (row.pendingAction === "add"))
        throw new Error("Trakt watchlist edit is awaiting confirmation");
    }
    for (const row of pendingRatings) {
      const rows = row.mediaType === "movie" ? movieRatings : showRatings;
      const remote = rows.find((item) =>
        String((row.mediaType === "movie" ? item.movie : item.show)?.ids.trakt) === row.traktId);
      if (row.pendingAction === "remove" ? Boolean(remote) : remote?.rating !== row.rating)
        throw new Error("Trakt rating edit is awaiting confirmation");
    }

    for (const {kind, rows} of snapshots) {
      const keys = new Set<string>();
      for (const item of rows) {
        const source = (kind === "movie" ? item.movie : item.show)!;
        const traktId = String(source.ids.trakt);
        keys.add(traktId);
        const titleId = await findTitleId(kind, source.ids.trakt!, source.ids.tmdb);
        const existing = await db.selectFrom("marqueeTraktWatchlist")
          .select(["tmdbId","posterPath","metadataCheckedAt"])
          .where("userId","=",userId).where("mediaType","=",kind)
          .where("traktId","=",traktId).executeTakeFirst();
        let artwork: Awaited<ReturnType<typeof fetchTraktWatchlistMetadata>> | null = null;
        if (!inShadowTransaction() && shouldRefreshWatchlistMetadata(existing, source.ids.tmdb, new Date())) {
          try {
            artwork = await fetchTraktWatchlistMetadata(kind, source.ids.tmdb!, source.year ?? null);
          } catch (error) {
            console.warn("Watch List artwork refresh failed for", kind, traktId,
              error instanceof Error ? error.message : error);
          }
        }
        const changedId = existing && existing.tmdbId !== (source.ids.tmdb ?? null);
        const metadata = artwork ?? (changedId ? {
          posterPath:null, overview:null, releaseDate:null, catalogStatus:null,
          isAnime:null, metadataCheckedAt:null,
        } : {});
        const values = {
          titleId, tmdbId: source.ids.tmdb ?? null,
          sourceTitle: source.title, sourceYear: source.year ?? null,
          listedAt: item.listed_at ? new Date(item.listed_at) : null,
          active: true, updatedAt: new Date(), ...metadata,
        };
        await db.insertInto("marqueeTraktWatchlist").values({
          userId, mediaType: kind, traktId, ...values,
        }).onConflict((oc) => oc.columns(["userId","mediaType","traktId"])
          .doUpdateSet(values).where("marqueeTraktWatchlist.pendingAction","is",null))
          .execute();
      }
      const local = await db.selectFrom("marqueeTraktWatchlist")
        .select(["id","traktId"]).where("userId","=",userId)
        .where("mediaType","=",kind).where("active","=",true)
        .where("pendingAction","is",null).execute();
      for (const row of local) if (!keys.has(row.traktId))
        await db.updateTable("marqueeTraktWatchlist")
          .set({active:false,updatedAt:new Date()})
          .where("id","=",row.id).where("pendingAction","is",null).execute();
    }
    for (const {kind, rows} of ratingSnapshots) {
      const keys = new Set<string>();
      for (const item of rows) {
        const source = (kind === "movie" ? item.movie : item.show)!;
        const traktId = String(source.ids.trakt);
        keys.add(traktId);
        const titleId = await findTitleId(kind, source.ids.trakt!, source.ids.tmdb);
        const ratedAt = new Date(item.rated_at!);
        const values = {
          titleId, tmdbId: source.ids.tmdb ?? null,
          sourceTitle: source.title, sourceYear: source.year ?? null,
          rating: item.rating!, ratedAt,
          tasteEligible: !(ratedAt.toISOString().startsWith("2026-02-05T15:5")),
          updatedAt: new Date(),
        };
        await db.insertInto("marqueeTraktRatings").values({
          userId, mediaType: kind, traktId, ...values,
        }).onConflict((oc) => oc.columns(["userId","mediaType","traktId"])
          .doUpdateSet(values).where("marqueeTraktRatings.pendingAction","is",null))
          .execute();
      }
      const local = await db.selectFrom("marqueeTraktRatings")
        .select(["id","traktId"]).where("userId","=",userId)
        .where("mediaType","=",kind).where("rating","is not",null)
        .where("pendingAction","is",null).execute();
      for (const row of local) if (!keys.has(row.traktId))
        await db.updateTable("marqueeTraktRatings")
          .set({rating:null,updatedAt:new Date()})
          .where("id","=",row.id).where("pendingAction","is",null).execute();
    }

    for (const row of pendingWatch) await db.updateTable("marqueeTraktWatchlist")
      .set({pendingAction:null,updatedAt:new Date()})
      .where("id","=",row.id)
      .where("pendingAction","=",row.pendingAction!).execute();
    for (const row of pendingRatings) await db.updateTable("marqueeTraktRatings")
      .set({pendingAction:null,updatedAt:new Date()})
      .where("id","=",row.id)
      .where("pendingAction","=",row.pendingAction!).execute();

    const now = new Date();
    const result = {
      watchlistCount: movies.length + shows.length,
      ratingsCount: movieRatings.length + showRatings.length,
    };
    await db.insertInto("marqueeTraktPersonalSyncState").values({
      userId, lastSuccessAt: now, lastError: null, ...result, updatedAt: now,
    }).onConflict((oc) => oc.column("userId").doUpdateSet({
      lastSuccessAt: now, lastError: null, ...result, updatedAt: now,
    })).execute();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trakt personal sync failed";
    await db.insertInto("marqueeTraktPersonalSyncState").values({
      userId, lastError: message.slice(0,500), updatedAt: new Date(),
    }).onConflict((oc) => oc.column("userId").doUpdateSet({
      lastError: message.slice(0,500), updatedAt: new Date(),
    })).execute();
    throw error;
  }
};

