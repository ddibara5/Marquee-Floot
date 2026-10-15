-- PREPARATION ONLY: rendered target selection, not authorization to execute.
-- Project: Marquee 9ba56374-eb1b-4942-af2f-e15e4df14755
-- Resource: Floot Database for Marquee Floot Pilot (never shared Supabase).
-- As observed 2026-10-01T19:23:49.433Z: 42 manifest/native public relations, zero existing barrier journal entries,
-- zero public runtime bindings. Revalidate drift/journal absence in the authorized window.
-- Prerequisites: explicit native/source binding/publication approval; fresh encrypted backup/restoration;
-- app-specific source/native/provider admission frozen and drained; install reviewed engine prerequisites;
-- control paused with live abort_at; no unresolved durable lease or provider acceptance.
-- Runtime package changes (NOT made here): MARQUEE_TRAKT_STORE='native'; MARQUEE_BARRIER_ACTIVE=true;
-- MARQUEE_BARRIER_SCHEMA='barrier_marquee_20260930_v2'. Retain native Auth and public table identity.
-- If journal-bearing registry/schema drift appears, abort and review a fresh barrier/baseline; do not erase it.

-- INERT preparation. Requires explicit app-scoped production authorization before rendering public.
-- Install safeguards.sql, extension, hardening, runtime-admission and runtime-binding first.
-- Keep release/store/enrollment switches disabled; run only during the bounded paused/drained window.
-- Rebinding is refused if the previous physical relations have any journal history. Preserve it;
-- choose a fresh reviewed barrier/baseline instead of deleting history.
DO $bind$
DECLARE expected jsonb='{"users":"public.users","sessions":"public.sessions","user_passwords":"public.user_passwords","login_attempts":"public.login_attempts","marquee_titles":"public.marquee_titles","marquee_seasons":"public.marquee_seasons","marquee_episodes":"public.marquee_episodes","marquee_watch_events":"public.marquee_watch_events","marquee_manual_title_statuses":"public.marquee_manual_title_statuses","marquee_episode_unwatched":"public.marquee_episode_unwatched","marquee_manual_trakt_outbox":"public.marquee_manual_trakt_outbox","marquee_trakt_oauth":"public.marquee_trakt_oauth","marquee_import_runs":"public.marquee_import_runs","marquee_import_controls":"public.marquee_import_controls","marquee_crunchyroll_raw":"public.marquee_crunchyroll_raw","marquee_crunchyroll_review":"public.marquee_crunchyroll_review","marquee_crunchyroll_sync_runs":"public.marquee_crunchyroll_sync_runs","marquee_crunchyroll_sync_state":"public.marquee_crunchyroll_sync_state","marquee_import_backups":"public.marquee_import_backups","marquee_import_pages":"public.marquee_import_pages","marquee_legacy_completions":"public.marquee_legacy_completions","marquee_legacy_import":"public.marquee_legacy_import","marquee_legacy_links":"public.marquee_legacy_links","marquee_legacy_ratings":"public.marquee_legacy_ratings","marquee_legacy_statuses":"public.marquee_legacy_statuses","marquee_legacy_watchlist":"public.marquee_legacy_watchlist","marquee_manual_episode_completions":"public.marquee_manual_episode_completions","marquee_series_catchup_corrections":"public.marquee_series_catchup_corrections","marquee_source_mappings":"public.marquee_source_mappings","marquee_title_aliases":"public.marquee_title_aliases","marquee_title_progress_baseline":"public.marquee_title_progress_baseline","marquee_title_watch_events":"public.marquee_title_watch_events","marquee_tmdb_mappings":"public.marquee_tmdb_mappings","marquee_tmdb_refresh_state":"public.marquee_tmdb_refresh_state","marquee_trakt_device_auth":"public.marquee_trakt_device_auth","marquee_trakt_mappings":"public.marquee_trakt_mappings","marquee_trakt_pending":"public.marquee_trakt_pending","marquee_trakt_personal_sync_state":"public.marquee_trakt_personal_sync_state","marquee_trakt_ratings":"public.marquee_trakt_ratings","marquee_trakt_sync_runs":"public.marquee_trakt_sync_runs","marquee_trakt_sync_state":"public.marquee_trakt_sync_state","marquee_trakt_watchlist":"public.marquee_trakt_watchlist"}'::jsonb; item record; previous regclass; target regclass; old_schema text;
BEGIN
 PERFORM 1 FROM barrier_marquee_20260930_v2.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM barrier_marquee_20260930_v2.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'UNRESOLVED_WRITER_LEASE'; END IF;
 IF EXISTS(SELECT 1 FROM barrier_marquee_20260930_v2.registry WHERE NOT (expected ? logical_name)) THEN RAISE EXCEPTION 'MIGRATION_BINDING_UNEXPECTED_TABLE'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(expected) LOOP
  target=to_regclass(item.value);
  IF target IS NULL THEN RAISE EXCEPTION 'MIGRATION_BINDING_TARGET_MISSING'; END IF;
  SELECT relation INTO previous FROM barrier_marquee_20260930_v2.registry WHERE logical_name=item.key;
  IF previous=target THEN CONTINUE; END IF;
  IF EXISTS(SELECT 1 FROM barrier_marquee_20260930_v2.journal) THEN RAISE EXCEPTION 'MIGRATION_BINDING_JOURNAL_REQUIRES_NEW_BASELINE'; END IF;
  IF previous IS NOT NULL THEN
   SELECT n.nspname INTO old_schema FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=previous;
   IF old_schema NOT LIKE 'candidate\_%' ESCAPE '\' AND old_schema NOT LIKE 'exercise\_%' ESCAPE '\' THEN RAISE EXCEPTION 'MIGRATION_BINDING_OLD_TARGET_REVIEW_REQUIRED'; END IF;
   IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=previous AND tgname='migration_gate' AND tgfoid='barrier_marquee_20260930_v2.gate()'::regprocedure)
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=previous AND tgname='migration_journal' AND tgfoid='barrier_marquee_20260930_v2.record()'::regprocedure) THEN RAISE EXCEPTION 'MIGRATION_BINDING_OLD_TRIGGER_MISMATCH'; END IF;
   EXECUTE format('DROP TRIGGER migration_gate ON %s',previous);
   EXECUTE format('DROP TRIGGER migration_journal ON %s',previous);
   DELETE FROM barrier_marquee_20260930_v2.registry WHERE relation=previous;
  END IF;
  PERFORM barrier_marquee_20260930_v2.register(target,item.key);
 END LOOP;
 PERFORM barrier_marquee_20260930_v2.require_binding(expected);
END $bind$;
-- Remains paused. This script does not change app modes, enroll users, resume writers or publish. 
