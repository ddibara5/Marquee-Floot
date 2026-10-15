import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { schema, type HistoryEvent, type UndatedTitle, type OutputType } from "./watch-history_GET.schema";

const PAGE_SIZE = 60;

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({
      page: url.searchParams.get("page") ?? undefined,
      filter: url.searchParams.get("filter") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    });
    const { user, session } = await getServerUserSession(request);
    const search = `%${input.query.trim()}%`;
    // Merge episode and movie check-ins before paging so neither media type
    // disappears from later pages. Hidden/corrected episodes are excluded.
    const datedPromise = sql<HistoryEvent>`
      WITH activity AS (
        SELECT 'episode'::text AS kind, w.id AS event_id, w.watched_at,
          COALESCE(a.canonical_title_id, s.title_id) AS title_id,
          s.season_number, e.episode_number, e.display_title AS episode_title
        FROM marquee_watch_events w
        JOIN marquee_episodes e ON e.id = w.episode_id
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases a ON a.duplicate_title_id = s.title_id
        WHERE w.user_id = ${user.id}
          AND w.watched_at >= '1980-01-01'::timestamp
          AND w.watched_at <= now()
          AND NOT EXISTS (
            SELECT 1 FROM marquee_episode_unwatched hidden
            WHERE hidden.user_id = w.user_id AND hidden.episode_id = w.episode_id
          )
        UNION ALL
        SELECT 'movie'::text, m.id, m.watched_at,
          COALESCE(a.canonical_title_id, m.title_id),
          NULL::integer, NULL::integer, NULL::text
        FROM marquee_title_watch_events m
        LEFT JOIN marquee_title_aliases a ON a.duplicate_title_id = m.title_id
        WHERE m.user_id = ${user.id}
          AND m.watched_at >= '1980-01-01'::timestamp
          AND m.watched_at <= now()
      )
      SELECT activity.kind AS "kind", activity.event_id AS "eventId",
        activity.watched_at AS "watchedAt", t.id AS "titleId",
        t.display_title AS "title", t.tmdb_poster_path AS "posterPath",
        t.is_anime AS "isAnime", activity.season_number AS "seasonNumber",
        activity.episode_number AS "episodeNumber",
        activity.episode_title AS "episodeTitle"
      FROM activity
      JOIN marquee_titles t ON t.id = activity.title_id
      WHERE t.display_title ILIKE ${search}
        AND (
          ${input.filter} = 'all'
          OR (${input.filter} = 'anime' AND t.is_anime)
          OR (${input.filter} = 'movies' AND t.media_type = 'movie' AND NOT t.is_anime)
          OR (${input.filter} = 'shows' AND t.media_type = 'show' AND NOT t.is_anime)
        )
      ORDER BY activity.watched_at DESC, activity.kind, activity.event_id DESC
      LIMIT ${PAGE_SIZE + 1} OFFSET ${input.page * PAGE_SIZE}
    `.execute(db);
    const undatedPromise = input.page === 0 ? sql<UndatedTitle>`
      WITH undated_episodes AS (
        SELECT episode_id FROM marquee_legacy_completions
        WHERE user_id = ${user.id} AND episode_id IS NOT NULL
        UNION
        SELECT episode_id FROM marquee_manual_episode_completions
        WHERE user_id = ${user.id}
        UNION
        SELECT episode_id FROM marquee_watch_events
        WHERE user_id = ${user.id} AND watched_at < '1980-01-01'::timestamp
      ),
      movie_titles AS (
        SELECT title_id FROM marquee_legacy_completions
        WHERE user_id = ${user.id} AND episode_id IS NULL AND title_id IS NOT NULL
        UNION
        SELECT title_id FROM marquee_title_watch_events
        WHERE user_id = ${user.id} AND watched_at < '1980-01-01'::timestamp
      ),
      grouped AS (
        SELECT COALESCE(a.canonical_title_id, s.title_id) AS title_id,
          'show'::text AS media_type, COUNT(DISTINCT e.id)::integer AS count
        FROM undated_episodes u
        JOIN marquee_episodes e ON e.id = u.episode_id
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases a ON a.duplicate_title_id = s.title_id
        WHERE NOT EXISTS (
            SELECT 1 FROM marquee_episode_unwatched hidden
            WHERE hidden.user_id = ${user.id} AND hidden.episode_id = e.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM marquee_watch_events dated
            WHERE dated.user_id = ${user.id} AND dated.episode_id = e.id
              AND dated.watched_at >= '1980-01-01'::timestamp
          )
        GROUP BY COALESCE(a.canonical_title_id, s.title_id)
        UNION ALL
        SELECT COALESCE(a.canonical_title_id, m.title_id), 'movie'::text, 1
        FROM movie_titles m
        LEFT JOIN marquee_title_aliases a ON a.duplicate_title_id = m.title_id
      )
      SELECT t.id AS "titleId", t.display_title AS "title",
        t.tmdb_poster_path AS "posterPath", t.is_anime AS "isAnime",
        t.media_type AS "mediaType", SUM(grouped.count)::integer AS "count"
      FROM grouped JOIN marquee_titles t ON t.id = grouped.title_id
      WHERE t.display_title ILIKE ${search}
        AND (
          ${input.filter} = 'all'
          OR (${input.filter} = 'anime' AND t.is_anime)
          OR (${input.filter} = 'movies' AND t.media_type = 'movie' AND NOT t.is_anime)
          OR (${input.filter} = 'shows' AND t.media_type = 'show' AND NOT t.is_anime)
        )
      GROUP BY t.id, t.display_title, t.tmdb_poster_path, t.is_anime, t.media_type
      ORDER BY t.display_title
      LIMIT 300
    `.execute(db) : Promise.resolve({ rows: [] as UndatedTitle[] });
    const [datedResult, undatedResult] = await Promise.all([datedPromise, undatedPromise]);
    const events = datedResult.rows.slice(0, PAGE_SIZE);
    const undated = undatedResult.rows;

    const response = new Response(superjson.stringify({
      events, undated,
      nextPage: datedResult.rows.length > PAGE_SIZE ? input.page + 1 : null,
    } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Watch history load error:", error);
    return new Response(superjson.stringify({ error: "Unable to load watch history" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}



export const handle = marqueeWriter.endpoint(handleRequest, "watch-history_GET.ts", true);
