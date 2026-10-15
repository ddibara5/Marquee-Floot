-- TEMPLATE ONLY. Render SOURCE_SCHEMA, FROZEN_BACKUP_ID and BATCH_ID after actual freeze.
-- All three rows are additions; existing equal rows are harmless, conflicts fail closed.
BEGIN;
DO $guard$
BEGIN
 IF current_setting('migration.approved_package',true) IS DISTINCT FROM 'marquee:activation:20261001' THEN RAISE EXCEPTION 'APPROVED_PACKAGE_REQUIRED'; END IF;
 IF current_setting('migration.frozen_backup_receipt',true) IS DISTINCT FROM '{{FROZEN_BACKUP_ID}}' THEN RAISE EXCEPTION 'FRESH_FROZEN_BACKUP_REQUIRED'; END IF;
 PERFORM 1 FROM barrier_marquee_20260930_v2.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM barrier_marquee_20260930_v2.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'UNRESOLVED_WRITER_LEASE'; END IF;
 -- The source barrier is on PostgreSQL Database, not this native resource.
 -- Operator must independently verify its actual paused control and zero unresolved leases immediately before/after this transaction.
 IF current_setting('migration.source_drain_verified',true) IS DISTINCT FROM 'marquee:legacy:paused-and-drained' THEN RAISE EXCEPTION 'EXTERNAL_SOURCE_DRAIN_ATTESTATION_REQUIRED'; END IF;
 PERFORM barrier_marquee_20260930_v2.require_binding('{{NATIVE_BINDINGS}}'::jsonb);
 IF (SELECT count(*) FROM {{SOURCE_SCHEMA}}.marquee_episodes WHERE id='8d0d1efa-b0d5-4614-aca7-9c7225cf3676' AND season_id='eaf92258-d03c-4089-910d-6ecce6a73a2e' AND episode_number=4)<>1 THEN RAISE EXCEPTION 'SOURCE_EPISODE_DRIFT'; END IF;
 IF (SELECT count(*) FROM public.marquee_episodes e JOIN public.marquee_seasons s ON s.id=e.season_id JOIN public.marquee_titles t ON t.id=s.title_id JOIN public.marquee_trakt_mappings m ON m.episode_id=e.id WHERE e.id=287 AND e.episode_number=4 AND s.season_number=1 AND t.id=2 AND t.display_title='Last Seen' AND m.entity_type='episode' AND m.trakt_id=14210359 AND m.tmdb_id=7321036)<>1 THEN RAISE EXCEPTION 'NATIVE_EPISODE_DRIFT'; END IF;
 IF (SELECT count(*) FROM public.marquee_legacy_links WHERE entity_type='season' AND source_id='eaf92258-d03c-4089-910d-6ecce6a73a2e' AND local_id=26)<>1 THEN RAISE EXCEPTION 'SEASON_CROSSWALK_DRIFT'; END IF;
 IF (SELECT count(*) FROM {{SOURCE_SCHEMA}}.marquee_source_mappings WHERE id='02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa' AND source='trakt' AND source_entity_type='episode' AND source_id='14210359' AND canonical_entity_type='episode' AND episode_id='8d0d1efa-b0d5-4614-aca7-9c7225cf3676' AND title_id IS NULL AND season_id IS NULL AND show_title_id IS NULL AND movie_title_id IS NULL AND match_method='external_id' AND rule_id IS NULL AND confidence IS NULL AND notes IS NULL AND NOT manual_locked)<>1 THEN RAISE EXCEPTION 'SOURCE_MAPPING_DRIFT'; END IF;
 IF (SELECT count(*) FROM {{SOURCE_SCHEMA}}.marquee_ratings WHERE id='6e7df7bb-99db-4d2c-a0eb-add526e9bb78' AND user_id='c566e7e0-880a-430d-85df-c40484144a91' AND title_id='2207ca90-82c5-4207-a870-70e2ab338647' AND season_id IS NULL AND score=9 AND source='trakt' AND source_record_id='180770' AND NOT manual_locked AND source_updated_at='2026-09-30T01:48:22Z')<>1 THEN RAISE EXCEPTION 'SOURCE_RATING_DRIFT'; END IF;
 IF (SELECT count(*) FROM public.marquee_legacy_links WHERE entity_type='title' AND source_id='2207ca90-82c5-4207-a870-70e2ab338647' AND local_id=6)<>1 OR (SELECT count(*) FROM public.marquee_trakt_ratings WHERE user_id=1 AND title_id=6 AND rating=9 AND trakt_id=180770 AND rated_at='2026-09-30T01:48:22Z' AND pending_action IS NULL)<>1 THEN RAISE EXCEPTION 'NATIVE_RATING_DRIFT'; END IF;
END $guard$;
SELECT barrier_marquee_20260930_v2.apply('{{BATCH_ID}}','[{"table":"marquee_legacy_links","before":null,"after":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"}},{"table":"marquee_source_mappings","before":null,"after":{"source":"trakt","source_entity_type":"episode","source_id":"14210359","canonical_entity_type":"episode","title_id":null,"season_id":null,"episode_id":287,"match_method":"external_id","rule_id":null,"confidence":null,"manual_locked":false,"notes":null,"legacy_id":"02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa"}},{"table":"marquee_legacy_ratings","before":null,"after":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":9,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"}}]'::jsonb);
COMMIT;
-- Preserve original source.created_at/updated_at in the protected source archive; native bridge shapes have no matching columns.
-- No native watch event, source date, manual row, outbox row or current Trakt rating is modified.
