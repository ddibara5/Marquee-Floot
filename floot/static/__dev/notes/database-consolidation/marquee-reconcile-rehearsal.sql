-- Isolated reconciliation; references only immutable preparation tables.
-- This crosswalk is supported by an existing title/season legacy link AND provider episode ID.
CREATE TABLE IF NOT EXISTS prep_marquee_20260930.candidate_episode_links (
 source_id uuid PRIMARY KEY, local_id integer UNIQUE NOT NULL,
 evidence jsonb NOT NULL
);
INSERT INTO prep_marquee_20260930.candidate_episode_links(source_id,local_id,evidence)
SELECT e.id,n.id,jsonb_build_object('rule','legacy-season-and-exact-Trakt-id','trakt_id',m.source_id,
 'native_tmdb_id',tm.tmdb_id,'season',s.season_number,'episode',e.episode_number)
FROM prep_marquee_20260930.t_marquee_episodes e
JOIN prep_marquee_20260930.t_marquee_seasons s ON s.id=e.season_id
JOIN prep_marquee_20260930.n_marquee_legacy_links sl ON sl.entity_type='season' AND sl.source_id=s.id
JOIN prep_marquee_20260930.n_marquee_episodes n ON n.season_id=sl.local_id AND n.episode_number=e.episode_number
JOIN prep_marquee_20260930.t_marquee_source_mappings m ON m.episode_id=e.id AND m.source='trakt' AND m.source_entity_type='episode'
JOIN prep_marquee_20260930.n_marquee_trakt_mappings tm ON tm.entity_type='episode' AND tm.trakt_id::text=m.source_id AND tm.episode_id=n.id
WHERE e.id='8d0d1efa-b0d5-4614-aca7-9c7225cf3676'
 AND NOT EXISTS(SELECT 1 FROM prep_marquee_20260930.n_marquee_legacy_links l WHERE l.entity_type='episode' AND l.source_id=e.id)
ON CONFLICT(source_id) DO NOTHING;

CREATE OR REPLACE VIEW prep_marquee_20260930.reconciled_links AS
SELECT entity_type,source_id,local_id FROM prep_marquee_20260930.n_marquee_legacy_links
UNION ALL SELECT 'episode',source_id,local_id FROM prep_marquee_20260930.candidate_episode_links;

CREATE OR REPLACE VIEW prep_marquee_20260930.history_reconciliation AS
WITH native_events AS (
 SELECT source_event_key,watched_at,episode_id,NULL::integer title_id FROM prep_marquee_20260930.n_marquee_watch_events
 UNION ALL SELECT source_event_key,watched_at,NULL,title_id FROM prep_marquee_20260930.n_marquee_title_watch_events
), source_events AS (
 SELECT h.*,l.local_id native_target,COALESCE(t.display_title,et.display_title) title
 FROM prep_marquee_20260930.t_marquee_watch_history h
 LEFT JOIN prep_marquee_20260930.reconciled_links l ON l.source_id=COALESCE(h.episode_id,h.movie_title_id)
 AND l.entity_type=CASE WHEN h.episode_id IS NOT NULL THEN 'episode' ELSE 'title' END
 LEFT JOIN prep_marquee_20260930.t_marquee_titles t ON t.id=h.movie_title_id
 LEFT JOIN prep_marquee_20260930.t_marquee_episodes e ON e.id=h.episode_id
 LEFT JOIN prep_marquee_20260930.t_marquee_seasons s ON s.id=e.season_id
 LEFT JOIN prep_marquee_20260930.t_marquee_titles et ON et.id=s.show_title_id
)
SELECT r.id,r.logical_event_key,r.title,r.watched_at,r.native_target,
 CASE WHEN n.source_event_key IS NULL AND lower(trim(r.title)) IN ('one piece','fairy tail') THEN 'excluded-archive-only'
 WHEN n.source_event_key IS NULL THEN 'missing'
 WHEN r.watched_at<>n.watched_at OR r.native_target IS DISTINCT FROM COALESCE(n.episode_id,n.title_id) THEN 'conflict'
 ELSE 'matched' END disposition
FROM source_events r LEFT JOIN native_events n ON n.source_event_key=r.logical_event_key;

-- No watch event is inserted; all nonexcluded source events are already present.
-- Preserve native manual rows, explicit unwatch, removed outbox records and newer source rows.
