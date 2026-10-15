-- Render prep_marquee_legacy_barrier_20261001 to a reviewed private schema. Never install on public without approval.
CREATE SCHEMA prep_marquee_legacy_barrier_20261001;
REVOKE ALL ON SCHEMA prep_marquee_legacy_barrier_20261001 FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA prep_marquee_legacy_barrier_20261001 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE prep_marquee_legacy_barrier_20261001.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 app text NOT NULL, mode text NOT NULL DEFAULT 'open' CHECK(mode IN('open','draining','paused')),
 epoch bigint NOT NULL DEFAULT 0, paused_at timestamptz, abort_at timestamptz, deadline timestamptz,
 native_enabled boolean NOT NULL DEFAULT false, enrollment_enabled boolean NOT NULL DEFAULT false,
 dual_writes boolean NOT NULL DEFAULT true
);
INSERT INTO prep_marquee_legacy_barrier_20261001.control(app) VALUES('marquee');
CREATE TABLE prep_marquee_legacy_barrier_20261001.registry (
 relation regclass PRIMARY KEY, logical_name text UNIQUE NOT NULL, pk text[] NOT NULL CHECK(cardinality(pk)>0)
);
CREATE TABLE prep_marquee_legacy_barrier_20261001.journal (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, epoch bigint NOT NULL,
 xid bigint NOT NULL DEFAULT txid_current(), relation regclass NOT NULL,
 logical_name text NOT NULL, operation text NOT NULL CHECK(operation IN('INSERT','UPDATE','DELETE')),
 old_key jsonb, new_key jsonb, before_row jsonb, after_row jsonb, at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE prep_marquee_legacy_barrier_20261001.receipts(batch_id text PRIMARY KEY,payload_hash text NOT NULL,changed bigint NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c prep_marquee_legacy_barrier_20261001.control%rowtype;
BEGIN
 -- The shared row lock lives until commit. A pause UPDATE waits for admitted writers.
 SELECT * INTO STRICT c FROM prep_marquee_legacy_barrier_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 IF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r prep_marquee_legacy_barrier_20261001.registry%rowtype; b jsonb; a jsonb; bk jsonb; ak jsonb; e bigint;
BEGIN
 SELECT * INTO STRICT r FROM prep_marquee_legacy_barrier_20261001.registry WHERE relation=TG_RELID;
 SELECT epoch INTO STRICT e FROM prep_marquee_legacy_barrier_20261001.control WHERE id;
 IF TG_OP<>'INSERT' THEN b=to_jsonb(OLD); SELECT jsonb_agg(b->k ORDER BY ord) INTO bk FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF TG_OP<>'DELETE' THEN a=to_jsonb(NEW); SELECT jsonb_agg(a->k ORDER BY ord) INTO ak FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 INSERT INTO prep_marquee_legacy_barrier_20261001.journal(epoch,relation,logical_name,operation,old_key,new_key,before_row,after_row)
 VALUES(e,TG_RELID,r.logical_name,TG_OP,bk,ak,b,a);
 RETURN NULL;
END $$;
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.register(t regclass,logical text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE keys text[];
BEGIN
 SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_catalog.pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.attnum
 WHERE c.conrelid=t AND c.contype='p';
 IF keys IS NULL THEN RAISE EXCEPTION 'PRIMARY_KEY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=t AND attgenerated<>'') THEN RAISE EXCEPTION 'GENERATED_COLUMN_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=t AND NOT tgisinternal AND tgenabled<>'O') THEN RAISE EXCEPTION 'TRIGGER_MODE_REVIEW_REQUIRED'; END IF;
 INSERT INTO prep_marquee_legacy_barrier_20261001.registry VALUES(t,logical,keys);
 EXECUTE format('CREATE TRIGGER migration_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION prep_marquee_legacy_barrier_20261001.gate()',t);
 EXECUTE format('CREATE TRIGGER migration_journal AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION prep_marquee_legacy_barrier_20261001.record()',t);
END $$;
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.pause() RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c prep_marquee_legacy_barrier_20261001.control%rowtype;
BEGIN
 -- Caller uses lock_timeout; never wait unboundedly for a long writer.
 UPDATE prep_marquee_legacy_barrier_20261001.control SET mode='draining',epoch=epoch+1,paused_at=clock_timestamp(),
 abort_at=clock_timestamp()+interval '10 minutes',deadline=clock_timestamp()+interval '15 minutes'
 WHERE id AND mode='open' RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAUSE_ALREADY_ACTIVE'; END IF;
 RETURN to_jsonb(c);
END $$;
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.drained(running bigint,leases bigint,external_verified boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF running<>0 OR leases<>0 OR NOT external_verified THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
 UPDATE prep_marquee_legacy_barrier_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $$;
CREATE FUNCTION prep_marquee_legacy_barrier_20261001.resume() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- No timer silently reopens writers during copy/rollback. The operator explicitly aborts/resumes.
 UPDATE prep_marquee_legacy_barrier_20261001.control SET mode='open',paused_at=NULL,abort_at=NULL,deadline=NULL WHERE id;
END $$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA prep_marquee_legacy_barrier_20261001 FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA prep_marquee_legacy_barrier_20261001 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA prep_marquee_legacy_barrier_20261001 FROM PUBLIC;
CREATE SCHEMA prep_marquee_legacy_writers_20261001; REVOKE ALL ON SCHEMA prep_marquee_legacy_writers_20261001 FROM PUBLIC;
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_episodes (LIKE public.marquee_episodes INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_episodes TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_episodes'::regclass,'marquee_episodes');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_franchise_overrides (LIKE public.marquee_franchise_overrides INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_franchise_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_franchise_overrides TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_franchise_overrides'::regclass,'marquee_franchise_overrides');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_ingest_raw (LIKE public.marquee_ingest_raw INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_ingest_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_ingest_raw TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_ingest_raw'::regclass,'marquee_ingest_raw');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_mapping_review (LIKE public.marquee_mapping_review INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_mapping_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_mapping_review TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_mapping_review'::regclass,'marquee_mapping_review');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_movies (LIKE public.marquee_movies INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_movies TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_movies'::regclass,'marquee_movies');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_ratings (LIKE public.marquee_ratings INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_ratings TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_ratings'::regclass,'marquee_ratings');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_season_release_schedules (LIKE public.marquee_season_release_schedules INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_season_release_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_season_release_schedules TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_season_release_schedules'::regclass,'marquee_season_release_schedules');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_seasons (LIKE public.marquee_seasons INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_seasons TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_seasons'::regclass,'marquee_seasons');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_shows (LIKE public.marquee_shows INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_shows TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_shows'::regclass,'marquee_shows');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_source_mappings (LIKE public.marquee_source_mappings INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_source_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_source_mappings TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_source_mappings'::regclass,'marquee_source_mappings');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_statuses (LIKE public.marquee_statuses INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_statuses TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_statuses'::regclass,'marquee_statuses');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_sync_runs (LIKE public.marquee_sync_runs INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_sync_runs TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_sync_runs'::regclass,'marquee_sync_runs');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_sync_state (LIKE public.marquee_sync_state INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_sync_state TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_sync_state'::regclass,'marquee_sync_state');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_titles (LIKE public.marquee_titles INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_titles TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_titles'::regclass,'marquee_titles');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_undated_completion_evidence (LIKE public.marquee_undated_completion_evidence INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_undated_completion_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_undated_completion_evidence TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_undated_completion_evidence'::regclass,'marquee_undated_completion_evidence');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_undated_completions (LIKE public.marquee_undated_completions INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_undated_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_undated_completions TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_undated_completions'::regclass,'marquee_undated_completions');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_verified_season_totals (LIKE public.marquee_verified_season_totals INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_verified_season_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_verified_season_totals TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_verified_season_totals'::regclass,'marquee_verified_season_totals');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_watch_date_decisions (LIKE public.marquee_watch_date_decisions INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_watch_date_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_watch_date_decisions TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_watch_date_decisions'::regclass,'marquee_watch_date_decisions');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_watch_history (LIKE public.marquee_watch_history INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_watch_history TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_watch_history'::regclass,'marquee_watch_history');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_watch_history_sources (LIKE public.marquee_watch_history_sources INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_watch_history_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_watch_history_sources TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_watch_history_sources'::regclass,'marquee_watch_history_sources');
CREATE TABLE prep_marquee_legacy_writers_20261001.marquee_watchlist (LIKE public.marquee_watchlist INCLUDING CONSTRAINTS INCLUDING INDEXES);
ALTER TABLE prep_marquee_legacy_writers_20261001.marquee_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_roles ON prep_marquee_legacy_writers_20261001.marquee_watchlist TO authenticated,service_role USING(true) WITH CHECK(true);
SELECT prep_marquee_legacy_barrier_20261001.register('prep_marquee_legacy_writers_20261001.marquee_watchlist'::regclass,'marquee_watchlist');
GRANT USAGE ON SCHEMA prep_marquee_legacy_writers_20261001 TO authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON ALL TABLES IN SCHEMA prep_marquee_legacy_writers_20261001 TO authenticated,service_role;
CREATE TABLE prep_marquee_legacy_barrier_20261001.exercise_evidence(id uuid PRIMARY KEY, evidence jsonb NOT NULL,at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON prep_marquee_legacy_barrier_20261001.exercise_evidence FROM PUBLIC,authenticated,service_role;

DO $test$
DECLARE target text; role_name text; op text; stmt text; blocked boolean; proof jsonb='[]';col text; phase text;
BEGIN
FOR phase IN SELECT unnest(ARRAY['open','draining','paused']) LOOP
IF phase='draining' THEN PERFORM prep_marquee_legacy_barrier_20261001.pause(); ELSIF phase='paused' THEN PERFORM prep_marquee_legacy_barrier_20261001.drained(0,0,true); END IF;
FOR role_name IN SELECT unnest(ARRAY['authenticated','service_role','postgres']) LOOP
FOR target IN SELECT unnest(ARRAY['marquee_episodes','marquee_franchise_overrides','marquee_ingest_raw','marquee_mapping_review','marquee_movies','marquee_ratings','marquee_season_release_schedules','marquee_seasons','marquee_shows','marquee_source_mappings','marquee_statuses','marquee_sync_runs','marquee_sync_state','marquee_titles','marquee_undated_completion_evidence','marquee_undated_completions','marquee_verified_season_totals','marquee_watch_date_decisions','marquee_watch_history','marquee_watch_history_sources','marquee_watchlist']) LOOP
col=('{"marquee_episodes":"id","marquee_franchise_overrides":"id","marquee_ingest_raw":"id","marquee_mapping_review":"id","marquee_movies":"title_id","marquee_ratings":"id","marquee_season_release_schedules":"season_id","marquee_seasons":"id","marquee_shows":"title_id","marquee_source_mappings":"id","marquee_statuses":"id","marquee_sync_runs":"id","marquee_sync_state":"source","marquee_titles":"id","marquee_undated_completion_evidence":"id","marquee_undated_completions":"id","marquee_verified_season_totals":"anilist_media_id","marquee_watch_date_decisions":"raw_id","marquee_watch_history":"id","marquee_watch_history_sources":"id","marquee_watchlist":"user_id"}'::jsonb)->>target;
FOR op IN SELECT unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']) LOOP
stmt=case op when 'INSERT' then format('INSERT INTO prep_marquee_legacy_writers_20261001.%I SELECT * FROM prep_marquee_legacy_writers_20261001.%I WHERE false',target,target)
when 'UPDATE' then format('UPDATE prep_marquee_legacy_writers_20261001.%I SET %I=%I WHERE false',target,col,col)
when 'DELETE' then format('DELETE FROM prep_marquee_legacy_writers_20261001.%I WHERE false',target)
else format('TRUNCATE prep_marquee_legacy_writers_20261001.%I',target) end;
blocked=false;
PERFORM set_config('role',role_name,true);
BEGIN
EXECUTE stmt;
EXCEPTION WHEN SQLSTATE '55000' THEN blocked=true;
END;
PERFORM set_config('role','postgres',true);
IF blocked IS DISTINCT FROM (phase<>'open' OR op='TRUNCATE') THEN RAISE EXCEPTION 'PRIVATE_WRITER_CHECK_FAILED:%/%/%/%',phase,role_name,target,op; END IF;
proof=proof||jsonb_build_array(jsonb_build_object('phase',phase,'role',role_name,'table',target,'operation',op,'blocked',blocked));
END LOOP; END LOOP; END LOOP; END LOOP;
PERFORM prep_marquee_legacy_barrier_20261001.resume();
INSERT INTO prep_marquee_legacy_barrier_20261001.exercise_evidence VALUES(gen_random_uuid(),jsonb_build_object('passed',true,'checks',jsonb_array_length(proof),'assertions',proof,'sourceRowsCopied',0,'productionWrites',false),now());
END $test$;
DO $checks$
DECLARE role_name text; failed boolean; n bigint; proof jsonb='[]'; stmt text;
BEGIN
FOR role_name IN SELECT unnest(ARRAY['authenticated','service_role']) LOOP
SELECT count(*) INTO n FROM prep_marquee_legacy_barrier_20261001.journal;
PERFORM set_config('role',role_name,true);
insert into prep_marquee_legacy_writers_20261001.marquee_sync_state(source,scope_key,watermark,consecutive_failures,updated_at) values('trakt','catalog','{}'::jsonb,0,'1999-01-02T03:04:05Z');update prep_marquee_legacy_writers_20261001.marquee_sync_state set consecutive_failures=1 where scope_key='catalog';delete from prep_marquee_legacy_writers_20261001.marquee_sync_state where scope_key='catalog';
PERFORM set_config('role','postgres',true);
IF (SELECT count(*) FROM prep_marquee_legacy_barrier_20261001.journal)<>n+3 THEN RAISE EXCEPTION 'PRIVATE_JOURNAL_LOST'; END IF;
proof=proof||jsonb_build_array(role_name||': actual insert/update/delete journaled');
FOR stmt IN SELECT unnest(ARRAY[
'update prep_marquee_legacy_barrier_20261001.control set mode=''open'' where id',
'delete from prep_marquee_legacy_barrier_20261001.journal',
'select prep_marquee_legacy_barrier_20261001.resume()',
'alter table prep_marquee_legacy_writers_20261001.marquee_sync_state disable trigger migration_gate',
'select set_config(''session_replication_role'',''replica'',true)']) LOOP
failed=false;
PERFORM set_config('role',role_name,true);
BEGIN EXECUTE stmt; EXCEPTION WHEN insufficient_privilege THEN failed=true; END;
PERFORM set_config('role','postgres',true);
IF NOT failed THEN RAISE EXCEPTION 'PRIVATE_PRIVILEGE_BYPASS:%',stmt; END IF;
proof=proof||jsonb_build_array(role_name||': rejected '||stmt);
END LOOP; END LOOP;
IF EXISTS(select 1 from prep_marquee_legacy_writers_20261001.marquee_sync_state) THEN RAISE EXCEPTION 'PRIVATE_TEST_ROW_REMAINS'; END IF;
INSERT INTO prep_marquee_legacy_barrier_20261001.exercise_evidence VALUES(gen_random_uuid(),jsonb_build_object('passed',true,'checks',jsonb_array_length(proof),'proof',proof,'productionWrites',false),now());
END $checks$;