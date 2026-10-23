import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { OutputType } from "./insights-context_GET.schema";

type WatchRow = { month: string; kind: "episode" | "movie"; titleId: number; title: string; watches: number; recentWatches:number };
type RatingRow = { titleId: number; score: number };
async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const [watch, rating, manualStatuses] = await Promise.all([
      sql<WatchRow>`
        WITH activity AS (
          SELECT 'episode'::text AS kind, w.watched_at,
            COALESCE(alias.canonical_title_id, s.title_id) AS title_id
          FROM marquee_watch_events w
          JOIN marquee_episodes e ON e.id = w.episode_id
          JOIN marquee_seasons s ON s.id = e.season_id
          LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
          WHERE w.user_id = ${user.id} AND w.watched_at >= '1980-01-01'::timestamp
            AND w.watched_at <= now()
            AND NOT EXISTS (
              SELECT 1 FROM marquee_episode_unwatched hidden
              WHERE hidden.user_id = ${user.id} AND hidden.episode_id = e.id
            )
          UNION ALL
          SELECT 'movie'::text, m.watched_at,
            COALESCE(alias.canonical_title_id, m.title_id)
          FROM marquee_title_watch_events m
          LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = m.title_id
          WHERE m.user_id = ${user.id} AND m.watched_at >= '1980-01-01'::timestamp
            AND m.watched_at <= now()
        )
        SELECT to_char(a.watched_at AT TIME ZONE 'America/New_York', 'YYYY-MM') AS month,
          a.kind, a.title_id AS "titleId", t.display_title AS title,
          count(*)::integer AS watches, count(*) filter(where a.watched_at >= now()-interval '30 days')::integer AS "recentWatches"
        FROM activity a JOIN marquee_titles t ON t.id = a.title_id
        GROUP BY month, a.kind, a.title_id, t.display_title
        ORDER BY month
      `.execute(db),
      sql<RatingRow>`
        SELECT t.id AS "titleId", COALESCE(tr.rating, local.score::numeric, t.score)::float AS score
        FROM marquee_titles t
        LEFT JOIN LATERAL (
          -- Half-point score only while it still rounds to the Trakt whole number (AF-20261023-06).
          SELECT CASE WHEN round(r.rating_score) = r.rating THEN r.rating_score ELSE r.rating END AS rating
          FROM marquee_trakt_ratings r
          WHERE r.user_id = ${user.id} AND r.title_id = t.id
            AND r.rating IS NOT NULL AND r.pending_action IS DISTINCT FROM 'remove'
          ORDER BY r.rated_at DESC NULLS LAST LIMIT 1
        ) tr ON true
        LEFT JOIN LATERAL (
          SELECT r.score FROM marquee_legacy_ratings r
          WHERE r.user_id = ${user.id} AND r.title_id = t.id AND r.source = 'manual'
          ORDER BY r.source_updated_at DESC NULLS LAST LIMIT 1
        ) local ON true
        WHERE COALESCE(tr.rating, local.score::numeric, t.score) IS NOT NULL
      `.execute(db),
      db.selectFrom("marqueeManualTitleStatuses").select(["titleId", "status"])
        .where("userId", "=", user.id).execute(),
    ]);
    const monthly = new Map<string, { month: string; episodes: number; movies: number }>();
    const top = new Map<number, { titleId: number; title: string; watches: number }>();
    let recentEpisodes = 0, recentMovies = 0, datedEvents = 0;
    for (const row of watch.rows) {
      const count = Number(row.watches);
      datedEvents += count;
      const month = monthly.get(row.month) ?? { month: row.month, episodes: 0, movies: 0 };
      if (row.kind === "episode") month.episodes += count; else month.movies += count;
      monthly.set(row.month, month);
      const item = top.get(row.titleId) ?? { titleId: row.titleId, title: row.title, watches: 0 };
      item.watches += Number(row.recentWatches); if(item.watches>0)top.set(row.titleId, item);
    }
    // Recent counts use event dates, not monthly aggregates.
    const recent = await sql<{ kind: string; count: number }>`
      SELECT kind, count(*)::integer AS count FROM (
        SELECT 'episode' AS kind, w.watched_at FROM marquee_watch_events w
        JOIN marquee_episodes e ON e.id = w.episode_id
        WHERE w.user_id = ${user.id} AND w.watched_at >= now() - interval '30 days'
          AND w.watched_at <= now() AND NOT EXISTS (
            SELECT 1 FROM marquee_episode_unwatched hidden
            WHERE hidden.user_id = ${user.id} AND hidden.episode_id = e.id)
        UNION ALL
        SELECT 'movie', m.watched_at FROM marquee_title_watch_events m
        WHERE m.user_id = ${user.id} AND m.watched_at >= now() - interval '30 days'
          AND m.watched_at <= now()
      ) dated GROUP BY kind
    `.execute(db);
    for (const row of recent.rows) {
      if (row.kind === "episode") recentEpisodes = Number(row.count);
      else recentMovies = Number(row.count);
    }
    const payload: OutputType = {
      monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
      mostWatched: [...top.values()].sort((a, b) => b.watches - a.watches).slice(0, 5),
      ratings: rating.rows.map(row => ({ titleId: row.titleId, score: Number(row.score) })),
      statuses: manualStatuses,
      recentEpisodes, recentMovies, datedEvents,
    };
    const response = new Response(superjson.stringify(payload), { headers: { "Content-Type": "application/json" } });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt, lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to load viewing insights",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500,
      headers: { "Content-Type": "application/json" } });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "insights-context_GET.ts", true);
