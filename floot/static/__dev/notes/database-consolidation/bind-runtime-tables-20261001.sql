-- INERT preparation. Requires explicit app-scoped production authorization before rendering public.
-- Install safeguards.sql, extension, hardening, runtime-admission and runtime-binding first.
-- Keep release/store/enrollment switches disabled; run only during the bounded paused/drained window.
-- Rebinding is refused if the previous physical relations have any journal history. Preserve it;
-- choose a fresh reviewed barrier/baseline instead of deleting history.
DO $bind$
DECLARE expected jsonb='{"users":"{{D}}.users","sessions":"{{D}}.sessions","user_passwords":"{{D}}.user_passwords","login_attempts":"{{D}}.login_attempts","marquee_titles":"{{D}}.marquee_titles","marquee_seasons":"{{D}}.marquee_seasons","marquee_episodes":"{{D}}.marquee_episodes","marquee_watch_events":"{{D}}.marquee_watch_events","marquee_manual_title_statuses":"{{D}}.marquee_manual_title_statuses","marquee_episode_unwatched":"{{D}}.marquee_episode_unwatched","marquee_manual_trakt_outbox":"{{D}}.marquee_manual_trakt_outbox","marquee_trakt_oauth":"{{D}}.marquee_trakt_oauth","marquee_import_runs":"{{D}}.marquee_import_runs","marquee_import_controls":"{{D}}.marquee_import_controls","marquee_crunchyroll_raw":"{{D}}.marquee_crunchyroll_raw","marquee_crunchyroll_review":"{{D}}.marquee_crunchyroll_review","marquee_crunchyroll_sync_runs":"{{D}}.marquee_crunchyroll_sync_runs","marquee_crunchyroll_sync_state":"{{D}}.marquee_crunchyroll_sync_state","marquee_import_backups":"{{D}}.marquee_import_backups","marquee_import_pages":"{{D}}.marquee_import_pages","marquee_legacy_completions":"{{D}}.marquee_legacy_completions","marquee_legacy_import":"{{D}}.marquee_legacy_import","marquee_legacy_links":"{{D}}.marquee_legacy_links","marquee_legacy_ratings":"{{D}}.marquee_legacy_ratings","marquee_legacy_statuses":"{{D}}.marquee_legacy_statuses","marquee_legacy_watchlist":"{{D}}.marquee_legacy_watchlist","marquee_manual_episode_completions":"{{D}}.marquee_manual_episode_completions","marquee_series_catchup_corrections":"{{D}}.marquee_series_catchup_corrections","marquee_source_mappings":"{{D}}.marquee_source_mappings","marquee_title_aliases":"{{D}}.marquee_title_aliases","marquee_title_progress_baseline":"{{D}}.marquee_title_progress_baseline","marquee_title_watch_events":"{{D}}.marquee_title_watch_events","marquee_tmdb_mappings":"{{D}}.marquee_tmdb_mappings","marquee_tmdb_refresh_state":"{{D}}.marquee_tmdb_refresh_state","marquee_trakt_device_auth":"{{D}}.marquee_trakt_device_auth","marquee_trakt_mappings":"{{D}}.marquee_trakt_mappings","marquee_trakt_pending":"{{D}}.marquee_trakt_pending","marquee_trakt_personal_sync_state":"{{D}}.marquee_trakt_personal_sync_state","marquee_trakt_ratings":"{{D}}.marquee_trakt_ratings","marquee_trakt_sync_runs":"{{D}}.marquee_trakt_sync_runs","marquee_trakt_sync_state":"{{D}}.marquee_trakt_sync_state","marquee_trakt_watchlist":"{{D}}.marquee_trakt_watchlist"}'::jsonb; item record; previous regclass; target regclass; old_schema text;
BEGIN
 PERFORM 1 FROM {{B}}.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM {{B}}.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'UNRESOLVED_WRITER_LEASE'; END IF;
 IF EXISTS(SELECT 1 FROM {{B}}.registry WHERE NOT (expected ? logical_name)) THEN RAISE EXCEPTION 'MIGRATION_BINDING_UNEXPECTED_TABLE'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(expected) LOOP
  target=to_regclass(item.value);
  IF target IS NULL THEN RAISE EXCEPTION 'MIGRATION_BINDING_TARGET_MISSING'; END IF;
  SELECT relation INTO previous FROM {{B}}.registry WHERE logical_name=item.key;
  IF previous=target THEN CONTINUE; END IF;
  IF EXISTS(SELECT 1 FROM {{B}}.journal) THEN RAISE EXCEPTION 'MIGRATION_BINDING_JOURNAL_REQUIRES_NEW_BASELINE'; END IF;
  IF previous IS NOT NULL THEN
   SELECT n.nspname INTO old_schema FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=previous;
   IF old_schema NOT LIKE 'candidate\_%' ESCAPE '\' AND old_schema NOT LIKE 'exercise\_%' ESCAPE '\' THEN RAISE EXCEPTION 'MIGRATION_BINDING_OLD_TARGET_REVIEW_REQUIRED'; END IF;
   IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=previous AND tgname='migration_gate' AND tgfoid='{{B}}.gate()'::regprocedure)
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=previous AND tgname='migration_journal' AND tgfoid='{{B}}.record()'::regprocedure) THEN RAISE EXCEPTION 'MIGRATION_BINDING_OLD_TRIGGER_MISMATCH'; END IF;
   EXECUTE format('DROP TRIGGER migration_gate ON %s',previous);
   EXECUTE format('DROP TRIGGER migration_journal ON %s',previous);
   DELETE FROM {{B}}.registry WHERE relation=previous;
  END IF;
  PERFORM {{B}}.register(target,item.key);
 END LOOP;
 PERFORM {{B}}.require_binding(expected);
END $bind$;
-- Remains paused. This script does not change app modes, enroll users, resume writers or publish. 