import { db } from "./db";
import { enrichTraktTmdbTitle, previewTraktTmdbTitle } from "./enrichTmdbTitle";
import type { TraktHistoryItem } from "./traktApi";

const excluded = new Set(["one piece", "fairy tail"]);

export const discoverTraktTitle = async (
  item: TraktHistoryItem,
  mediaType: "show" | "movie"
): Promise<number | null> => {
  const source = mediaType === "show" ? item.show : item.movie;
  const traktId = source?.ids.trakt;
  const tmdbId = source?.ids.tmdb;
  const sourceTitle = source?.title?.trim();
  const sourceYear = source?.year;

  if (!traktId || !tmdbId || !sourceTitle || !sourceYear ||
      excluded.has(sourceTitle.toLowerCase())) return null;

  const media = mediaType === "show" ? "tv" : "movie";
  const traktMapping = await db.selectFrom("marqueeTraktMappings")
    .select(["titleId", "tmdbId"])
    .where("entityType", "=", mediaType)
    .where("traktId", "=", String(traktId)).executeTakeFirst();
  if (traktMapping) {
    if (traktMapping.tmdbId && traktMapping.tmdbId !== tmdbId) return null;
    return traktMapping.titleId;
  }

  // A direct external-ID mapping wins. Conflicting identities remain pending.
  const tmdbMapping = await db.selectFrom("marqueeTmdbMappings")
    .select(["titleId"])
    .where("mediaType", "=", media)
    .where("tmdbId", "=", tmdbId).executeTakeFirst();
  let titleId = tmdbMapping?.titleId ?? null;
  if (titleId) {
    const title = await db.selectFrom("marqueeTitles")
      .select(["mediaType", "isAnime"]).where("id", "=", titleId)
      .executeTakeFirst();
    // A verified TMDB identity can belong to an anime film already in the library.
    if (!title || title.mediaType !== mediaType) return null;
  } else {
    const preview = await previewTraktTmdbTitle(
      mediaType, tmdbId, sourceTitle, sourceYear
    );
    if (!preview) return null;

    const sameTitle = await db.selectFrom("marqueeTitles")
      .select(["id", "mediaType", "releaseYear", "isAnime"])
      .where("displayTitle", "=", sourceTitle).executeTakeFirst();
    if (sameTitle) {
      if (sameTitle.mediaType !== mediaType || sameTitle.isAnime ||
          (sameTitle.releaseYear && sameTitle.releaseYear !== sourceYear)) {
        return null;
      }
      const otherMapping = await db.selectFrom("marqueeTmdbMappings")
        .select(["tmdbId"]).where("titleId", "=", sameTitle.id)
        .executeTakeFirst();
      if (otherMapping && otherMapping.tmdbId !== tmdbId) return null;
      titleId = sameTitle.id;
    } else {
      // Unique title constraint also protects concurrent syncs from duplication.
      const inserted = await db.insertInto("marqueeTitles").values({
        displayTitle: sourceTitle, mediaType, releaseYear: sourceYear,
        isAnime: preview.isAnimation,
      }).onConflict((oc) => oc.column("displayTitle").doNothing())
        .returning(["id"]).executeTakeFirst();
      if (!inserted) return null;
      titleId = inserted.id;
    }

    await enrichTraktTmdbTitle(titleId, tmdbId, preview.confidence);
  }

  if (!titleId) return null;
  await db.insertInto("marqueeTraktMappings").values({
    entityType: mediaType, traktId, titleId, episodeId: null,
    tmdbId, updatedAt: new Date(),
  }).onConflict((oc) => oc.columns(["entityType", "traktId"]).doNothing())
    .execute();
  const final = await db.selectFrom("marqueeTraktMappings")
    .select(["titleId", "tmdbId"])
    .where("entityType", "=", mediaType)
    .where("traktId", "=", String(traktId)).executeTakeFirst();
  return final?.titleId === titleId &&
    (!final.tmdbId || final.tmdbId === tmdbId) ? titleId : null;
};
