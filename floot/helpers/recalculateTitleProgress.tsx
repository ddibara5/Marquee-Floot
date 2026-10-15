import { sql, type Kysely, type Transaction } from "kysely";
import type { DB } from "./schema";

// The migration baseline keeps pre-existing progress when a manual event is undone.
// All subsequent changes are derived from distinct episodes and source observations.
export async function recalculateTitleProgress(
  executor: Kysely<DB> | Transaction<DB>,
  userId: number,
  titleId: number
) {
  await sql`
    INSERT INTO marquee_title_progress_baseline(title_id,watched_floor,last_watched_at)
    SELECT id,0,NULL FROM marquee_titles WHERE id=${titleId}
    ON CONFLICT(title_id) DO NOTHING
  `.execute(executor);
  await sql`
    UPDATE marquee_titles t SET
      watched_episodes = CASE WHEN t.media_type='movie' THEN
        GREATEST(b.watched_floor, CASE WHEN
          EXISTS(SELECT 1 FROM marquee_title_watch_events w
            WHERE w.title_id=t.id AND w.user_id=${userId})
          OR EXISTS(SELECT 1 FROM marquee_legacy_completions c
            WHERE c.title_id=t.id AND c.user_id=${userId})
          THEN 1 ELSE 0 END)
      ELSE GREATEST(b.watched_floor - (
        SELECT count(*)::int FROM marquee_episode_unwatched o
        JOIN marquee_episodes e ON e.id=o.episode_id
        JOIN marquee_seasons s ON s.id=e.season_id
        WHERE o.user_id=${userId} AND s.title_id=t.id
      ), (
        SELECT count(*)::int FROM marquee_episodes e
        JOIN marquee_seasons s ON s.id=e.season_id
        WHERE s.title_id=t.id
          AND NOT EXISTS(SELECT 1 FROM marquee_episode_unwatched o
            WHERE o.episode_id=e.id AND o.user_id=${userId}) AND (
          EXISTS(SELECT 1 FROM marquee_watch_events w
            WHERE w.episode_id=e.id AND w.user_id=${userId})
          OR EXISTS(SELECT 1 FROM marquee_legacy_completions c
            WHERE c.episode_id=e.id AND c.user_id=${userId})
          OR EXISTS(SELECT 1 FROM marquee_manual_episode_completions c
            WHERE c.episode_id=e.id AND c.user_id=${userId})
        )
      )) END,
      last_watched_at = CASE WHEN t.media_type='show' AND EXISTS(
        SELECT 1 FROM marquee_episode_unwatched o
        JOIN marquee_episodes e ON e.id=o.episode_id
        JOIN marquee_seasons s ON s.id=e.season_id
        WHERE o.user_id=${userId} AND s.title_id=t.id
      ) THEN (
        SELECT max(w.watched_at) FROM marquee_watch_events w
        JOIN marquee_episodes e ON e.id=w.episode_id
        JOIN marquee_seasons s ON s.id=e.season_id
        WHERE s.title_id=t.id AND w.user_id=${userId}
          AND w.watched_at >= '1980-01-01'::timestamptz
          AND NOT EXISTS(SELECT 1 FROM marquee_episode_unwatched o
            WHERE o.user_id=${userId} AND o.episode_id=e.id)
      ) ELSE GREATEST(
        b.last_watched_at,
        (SELECT max(w.watched_at) FROM marquee_title_watch_events w
          WHERE w.title_id=t.id AND w.user_id=${userId}
            AND w.watched_at >= '1980-01-01'::timestamptz),
        (SELECT max(w.watched_at) FROM marquee_watch_events w
          JOIN marquee_episodes e ON e.id=w.episode_id
          JOIN marquee_seasons s ON s.id=e.season_id
          WHERE s.title_id=t.id AND w.user_id=${userId}
            AND w.watched_at >= '1980-01-01'::timestamptz)
      ) END,
      released_episodes = CASE WHEN t.media_type='movie'
        THEN GREATEST(t.released_episodes,1)
        ELSE t.released_episodes END,
      updated_at=now()
    FROM marquee_title_progress_baseline b
    WHERE b.title_id=t.id AND t.id=${titleId}
  `.execute(executor);
  await sql`
    UPDATE marquee_titles SET last_watched_at=NULL
    WHERE id=${titleId} AND media_type='show' AND watched_episodes=0
  `.execute(executor);
}