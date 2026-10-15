import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { LastEpisode, NextEpisode, OutputType, UpcomingEpisode, WeekDay } from "./home-context_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    // Episode `e` has not been watched by this user (same rules as before, shared by both laterals).
    const unwatched = sql`
      NOT EXISTS (
        SELECT 1 FROM marquee_legacy_completions legacy
        WHERE legacy.user_id = ${user.id} AND legacy.episode_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM marquee_manual_episode_completions completed
        WHERE completed.user_id = ${user.id} AND completed.episode_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM marquee_watch_events watched
        WHERE watched.user_id = ${user.id} AND watched.episode_id = e.id
          AND NOT EXISTS (
            SELECT 1 FROM marquee_episode_unwatched corrected
            WHERE corrected.user_id = ${user.id} AND corrected.episode_id = e.id
          )
      )`;
    const aired = sql`(e.aired_at IS NULL OR e.aired_at::date <= (now() AT TIME ZONE 'America/New_York')::date)`;
    const notCorrected = sql`NOT EXISTS (
      SELECT 1 FROM marquee_episode_unwatched corrected
      WHERE corrected.user_id = ${user.id} AND corrected.episode_id = w.episode_id)`;
    const weekStart = sql`(((now() AT TIME ZONE 'America/New_York')::date - 6)::timestamp AT TIME ZONE 'America/New_York')`;

    const [next, days, weekTitles, upcoming, lastEpisodes] = await Promise.all([
      sql<NextEpisode>`
      SELECT t.id AS "titleId", next_episode.id AS "episodeId",
        next_episode.season_number AS "seasonNumber",
        next_episode.episode_number AS "episodeNumber",
        next_episode.display_title AS "episodeTitle",
        next_episode.aired_at AS "airedAt",
        next_episode.tmdb_still_path AS "stillPath",
        t.last_watched_at AS "lastWatchedAt",
        next_episode.overview AS "overview",
        next_episode.runtime_minutes AS "runtimeMinutes",
        ready.n AS "readyCount"
      FROM marquee_titles t
      LEFT JOIN marquee_manual_title_statuses manual
        ON manual.title_id = t.id AND manual.user_id = ${user.id}
      JOIN LATERAL (
        SELECT e.id, s.season_number, e.episode_number, e.display_title,
          e.aired_at, e.tmdb_still_path, e.overview, e.runtime_minutes
        FROM marquee_episodes e
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
        WHERE COALESCE(alias.canonical_title_id, s.title_id) = t.id
          AND ${aired} AND ${unwatched}
        ORDER BY s.season_number NULLS LAST, e.episode_number NULLS LAST, e.id
        LIMIT 1
      ) next_episode ON true
      JOIN LATERAL (
        SELECT count(*)::int AS n
        FROM marquee_episodes e
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
        WHERE COALESCE(alias.canonical_title_id, s.title_id) = t.id
          AND e.aired_at IS NOT NULL AND ${aired} AND ${unwatched}
      ) ready ON true
      WHERE t.media_type = 'show' AND t.watched_episodes > 0
        AND COALESCE(manual.status, '') NOT IN ('paused', 'dropped')
        AND (t.last_watched_at >= now() - interval '21 days'
          OR next_episode.aired_at > t.last_watched_at)
      ORDER BY t.last_watched_at DESC NULLS LAST
      LIMIT 12
    `.execute(db),
      // Last 7 Eastern days, today included: distinct episodes and movie watches per day.
      sql<WeekDay>`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS "date",
        (SELECT count(DISTINCT w.episode_id)::int FROM marquee_watch_events w
          WHERE w.user_id = ${user.id}
            AND w.watched_at >= (d.day::timestamp AT TIME ZONE 'America/New_York')
            AND w.watched_at < ((d.day + 1)::timestamp AT TIME ZONE 'America/New_York')
            AND ${notCorrected}) AS "episodes",
        (SELECT count(*)::int FROM marquee_title_watch_events m
          WHERE m.user_id = ${user.id}
            AND m.watched_at >= (d.day::timestamp AT TIME ZONE 'America/New_York')
            AND m.watched_at < ((d.day + 1)::timestamp AT TIME ZONE 'America/New_York')) AS "movies"
      FROM (SELECT ((now() AT TIME ZONE 'America/New_York')::date - g)::date AS day
        FROM generate_series(0, 6) g) d
      ORDER BY d.day
    `.execute(db),
      sql<{ n: number }>`
      SELECT (
        (SELECT count(DISTINCT COALESCE(alias.canonical_title_id, s.title_id))
          FROM marquee_watch_events w
          JOIN marquee_episodes e ON e.id = w.episode_id
          JOIN marquee_seasons s ON s.id = e.season_id
          LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
          WHERE w.user_id = ${user.id} AND w.watched_at >= ${weekStart} AND ${notCorrected})
        + (SELECT count(DISTINCT m.title_id) FROM marquee_title_watch_events m
          WHERE m.user_id = ${user.id} AND m.watched_at >= ${weekStart})
      )::int AS n
    `.execute(db),
      // First upcoming episode per started show (not paused or dropped), next 60 days.
      sql<UpcomingEpisode>`
      SELECT * FROM (
        SELECT DISTINCT ON (t.id) t.id AS "titleId", s.season_number AS "seasonNumber",
          e.episode_number AS "episodeNumber", e.display_title AS "episodeTitle", e.aired_at AS "airedAt"
        FROM marquee_episodes e
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
        JOIN marquee_titles t ON t.id = COALESCE(alias.canonical_title_id, s.title_id)
        LEFT JOIN marquee_manual_title_statuses manual
          ON manual.title_id = t.id AND manual.user_id = ${user.id}
        WHERE t.media_type = 'show' AND t.watched_episodes > 0
          AND COALESCE(manual.status, '') NOT IN ('paused', 'dropped')
          AND e.aired_at::date > (now() AT TIME ZONE 'America/New_York')::date
          AND e.aired_at::date <= (now() AT TIME ZONE 'America/New_York')::date + 60
        ORDER BY t.id, e.aired_at, s.season_number, e.episode_number
      ) firsts ORDER BY "airedAt" LIMIT 6
    `.execute(db),
      // Latest watched episode per show, for naming it in Recent activity.
      sql<LastEpisode>`
      SELECT * FROM (
        SELECT DISTINCT ON (COALESCE(alias.canonical_title_id, s.title_id))
          COALESCE(alias.canonical_title_id, s.title_id) AS "titleId",
          s.season_number AS "seasonNumber", e.episode_number AS "episodeNumber",
          e.display_title AS "episodeTitle", w.watched_at AS "watchedAt"
        FROM marquee_watch_events w
        JOIN marquee_episodes e ON e.id = w.episode_id
        JOIN marquee_seasons s ON s.id = e.season_id
        LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
        WHERE w.user_id = ${user.id} AND w.watched_at >= now() - interval '120 days' AND ${notCorrected}
        ORDER BY COALESCE(alias.canonical_title_id, s.title_id), w.watched_at DESC
      ) latest ORDER BY "watchedAt" DESC LIMIT 20
    `.execute(db),
    ]);
    const response = new Response(superjson.stringify({
      nextEpisodes: next.rows,
      week: { days: days.rows, titles: weekTitles.rows[0]?.n ?? 0 },
      upcoming: upcoming.rows,
      lastEpisodes: lastEpisodes.rows,
    } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to load next episodes",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500,
      headers: { "Content-Type": "application/json" } });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "home-context_GET.ts", true);
