-- INERT: separate production activation authorization and fresh restored backup required.
-- Approval GUCs are operator attestations, not proof or access controls. This script has NOT been run on public.
BEGIN;
SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='60s';
DO $guard$ BEGIN
IF current_setting('migration.approved_package',true) IS DISTINCT FROM 'marquee:legacy-binding:20261001' THEN RAISE EXCEPTION 'SEPARATE_ACTIVATION_APPROVAL_REQUIRED';END IF;
IF coalesce(current_setting('migration.final_backup_receipt',true),'')='' THEN RAISE EXCEPTION 'FRESH_RESTORED_BACKUP_REQUIRED';END IF;
END $guard$;
LOCK TABLE public.marquee_episodes IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_franchise_overrides IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_ingest_raw IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_mapping_review IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_movies IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_ratings IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_season_release_schedules IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_seasons IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_shows IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_source_mappings IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_statuses IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_sync_runs IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_sync_state IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_titles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_undated_completion_evidence IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_undated_completions IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_verified_season_totals IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_watch_date_decisions IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_watch_history IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_watch_history_sources IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.marquee_watchlist IN ACCESS EXCLUSIVE MODE;
DO $binding$
DECLARE item jsonb; target regclass; keys text[]; actual_hash text; actual_owner text;
BEGIN
FOR item IN SELECT value FROM jsonb_array_elements('[{"name":"marquee_episodes","pk":["id"],"shape_hash":"06504ff805fe7aef58ffdd0235862b8b","owner":"postgres"},{"name":"marquee_franchise_overrides","pk":["id"],"shape_hash":"6df2aca0e447f0e822b93322a9991c09","owner":"postgres"},{"name":"marquee_ingest_raw","pk":["id"],"shape_hash":"a31ed3bba79d127726690bb2c803b68e","owner":"postgres"},{"name":"marquee_mapping_review","pk":["id"],"shape_hash":"36031e8c6a4790273eec257ba78d08dd","owner":"postgres"},{"name":"marquee_movies","pk":["title_id"],"shape_hash":"499884b0305b46fdf64ca9f2695c1293","owner":"postgres"},{"name":"marquee_ratings","pk":["id"],"shape_hash":"bd4cac5bf7fa2761fc0bb5d289057e4e","owner":"postgres"},{"name":"marquee_season_release_schedules","pk":["season_id"],"shape_hash":"1c62d6066bfffa074c1ae6ef8059cbec","owner":"postgres"},{"name":"marquee_seasons","pk":["id"],"shape_hash":"716a119ced53c5980d053359a3bd477f","owner":"postgres"},{"name":"marquee_shows","pk":["title_id"],"shape_hash":"f9e0873f4aafb5ba346d2074dd3aa01f","owner":"postgres"},{"name":"marquee_source_mappings","pk":["id"],"shape_hash":"959232c62d38c57eda9c726ae6b57e34","owner":"postgres"},{"name":"marquee_statuses","pk":["id"],"shape_hash":"99d2a41d344a4a4a0718f57b5095c1bc","owner":"postgres"},{"name":"marquee_sync_runs","pk":["id"],"shape_hash":"66ea9711bdb8515a1cd9eb5d4a5d0227","owner":"postgres"},{"name":"marquee_sync_state","pk":["source","scope_key"],"shape_hash":"7757a6e9a92f44a0e2695978af63d5b4","owner":"postgres"},{"name":"marquee_titles","pk":["id"],"shape_hash":"8d9d77d58481540518d61bc04d431e12","owner":"postgres"},{"name":"marquee_undated_completion_evidence","pk":["id"],"shape_hash":"d20badd39afbbf3d3b7278668717f341","owner":"postgres"},{"name":"marquee_undated_completions","pk":["id"],"shape_hash":"4f027d8ac462efbf2b2652ddf1a7c37d","owner":"postgres"},{"name":"marquee_verified_season_totals","pk":["anilist_media_id"],"shape_hash":"c2ce3554ea71ba90a8fbabc0442e1069","owner":"postgres"},{"name":"marquee_watch_date_decisions","pk":["raw_id"],"shape_hash":"1223d15205f950bf13693ce56e093bfb","owner":"postgres"},{"name":"marquee_watch_history","pk":["id"],"shape_hash":"51a7e56743dbd19f377f3bd447626aa0","owner":"postgres"},{"name":"marquee_watch_history_sources","pk":["id"],"shape_hash":"4bf8de3a60a71b12f88ad62554df6032","owner":"postgres"},{"name":"marquee_watchlist","pk":["user_id","title_id"],"shape_hash":"ab0ea6ed3e38f5478d478a71598cc083","owner":"postgres"}]'::jsonb) LOOP
 target=to_regclass('public.'||(item->>'name'));IF target IS NULL THEN RAISE EXCEPTION 'LEGACY_TABLE_MISSING';END IF;
 SELECT array_agg(a.attname ORDER BY p.ord) INTO keys FROM pg_constraint k CROSS JOIN LATERAL unnest(k.conkey) WITH ORDINALITY p(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=p.num WHERE k.conrelid=target AND k.contype='p';
 IF to_jsonb(keys) IS DISTINCT FROM item->'pk' THEN RAISE EXCEPTION 'LEGACY_PRIMARY_KEY_DRIFT';END IF;
 SELECT md5(jsonb_agg(jsonb_build_object('name',a.attname,'typeOid',a.atttypid,'typeMod',a.atttypmod,'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum)::text) INTO actual_hash FROM pg_attribute a WHERE a.attrelid=target AND a.attnum>0 AND NOT a.attisdropped;
 SELECT pg_get_userbyid(relowner) INTO actual_owner FROM pg_class WHERE oid=target AND relkind='r';
 IF actual_hash IS DISTINCT FROM item->>'shape_hash' OR actual_owner IS DISTINCT FROM item->>'owner' THEN RAISE EXCEPTION 'LEGACY_SHAPE_OR_OWNER_DRIFT';END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=target AND NOT tgisinternal AND (tgenabled<>'O' OR tgname IN('migration_gate','migration_journal'))) THEN RAISE EXCEPTION 'LEGACY_EXISTING_BINDING_OR_TRIGGER_REVIEW';END IF;
END LOOP;END $binding$;
-- Render barrier_marquee_legacy_live_20261001 to a reviewed private schema. Never install on public without approval.
CREATE SCHEMA barrier_marquee_legacy_live_20261001;
REVOKE ALL ON SCHEMA barrier_marquee_legacy_live_20261001 FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA barrier_marquee_legacy_live_20261001 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE barrier_marquee_legacy_live_20261001.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 app text NOT NULL, mode text NOT NULL DEFAULT 'open' CHECK(mode IN('open','draining','paused')),
 epoch bigint NOT NULL DEFAULT 0, paused_at timestamptz, abort_at timestamptz, deadline timestamptz,
 native_enabled boolean NOT NULL DEFAULT false, enrollment_enabled boolean NOT NULL DEFAULT false,
 dual_writes boolean NOT NULL DEFAULT true
);
INSERT INTO barrier_marquee_legacy_live_20261001.control(app) VALUES('marquee');
CREATE TABLE barrier_marquee_legacy_live_20261001.registry (
 relation regclass PRIMARY KEY, logical_name text UNIQUE NOT NULL, pk text[] NOT NULL CHECK(cardinality(pk)>0)
);
CREATE TABLE barrier_marquee_legacy_live_20261001.journal (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, epoch bigint NOT NULL,
 xid bigint NOT NULL DEFAULT txid_current(), relation regclass NOT NULL,
 logical_name text NOT NULL, operation text NOT NULL CHECK(operation IN('INSERT','UPDATE','DELETE')),
 old_key jsonb, new_key jsonb, before_row jsonb, after_row jsonb, at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE barrier_marquee_legacy_live_20261001.receipts(batch_id text PRIMARY KEY,payload_hash text NOT NULL,changed bigint NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION barrier_marquee_legacy_live_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c barrier_marquee_legacy_live_20261001.control%rowtype;
BEGIN
 -- The shared row lock lives until commit. A pause UPDATE waits for admitted writers.
 SELECT * INTO STRICT c FROM barrier_marquee_legacy_live_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 IF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_legacy_live_20261001.record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r barrier_marquee_legacy_live_20261001.registry%rowtype; b jsonb; a jsonb; bk jsonb; ak jsonb; e bigint;
BEGIN
 SELECT * INTO STRICT r FROM barrier_marquee_legacy_live_20261001.registry WHERE relation=TG_RELID;
 SELECT epoch INTO STRICT e FROM barrier_marquee_legacy_live_20261001.control WHERE id;
 IF TG_OP<>'INSERT' THEN b=to_jsonb(OLD); SELECT jsonb_agg(b->k ORDER BY ord) INTO bk FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF TG_OP<>'DELETE' THEN a=to_jsonb(NEW); SELECT jsonb_agg(a->k ORDER BY ord) INTO ak FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 INSERT INTO barrier_marquee_legacy_live_20261001.journal(epoch,relation,logical_name,operation,old_key,new_key,before_row,after_row)
 VALUES(e,TG_RELID,r.logical_name,TG_OP,bk,ak,b,a);
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_legacy_live_20261001.register(t regclass,logical text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE keys text[];
BEGIN
 SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_catalog.pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.attnum
 WHERE c.conrelid=t AND c.contype='p';
 IF keys IS NULL THEN RAISE EXCEPTION 'PRIMARY_KEY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=t AND attgenerated<>'') THEN RAISE EXCEPTION 'GENERATED_COLUMN_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=t AND NOT tgisinternal AND tgenabled<>'O') THEN RAISE EXCEPTION 'TRIGGER_MODE_REVIEW_REQUIRED'; END IF;
 INSERT INTO barrier_marquee_legacy_live_20261001.registry VALUES(t,logical,keys);
 EXECUTE format('CREATE TRIGGER migration_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION barrier_marquee_legacy_live_20261001.gate()',t);
 EXECUTE format('CREATE TRIGGER migration_journal AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION barrier_marquee_legacy_live_20261001.record()',t);
END $$;
CREATE FUNCTION barrier_marquee_legacy_live_20261001.pause() RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c barrier_marquee_legacy_live_20261001.control%rowtype;
BEGIN
 -- Caller uses lock_timeout; never wait unboundedly for a long writer.
 UPDATE barrier_marquee_legacy_live_20261001.control SET mode='draining',epoch=epoch+1,paused_at=clock_timestamp(),
 abort_at=clock_timestamp()+interval '10 minutes',deadline=clock_timestamp()+interval '15 minutes'
 WHERE id AND mode='open' RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAUSE_ALREADY_ACTIVE'; END IF;
 RETURN to_jsonb(c);
END $$;
CREATE FUNCTION barrier_marquee_legacy_live_20261001.drained(running bigint,leases bigint,external_verified boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF running<>0 OR leases<>0 OR NOT external_verified THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
 UPDATE barrier_marquee_legacy_live_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $$;
CREATE FUNCTION barrier_marquee_legacy_live_20261001.resume() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- No timer silently reopens writers during copy/rollback. The operator explicitly aborts/resumes.
 UPDATE barrier_marquee_legacy_live_20261001.control SET mode='open',paused_at=NULL,abort_at=NULL,deadline=NULL WHERE id;
END $$;
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_episodes'::regclass,'marquee_episodes');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_franchise_overrides'::regclass,'marquee_franchise_overrides');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_ingest_raw'::regclass,'marquee_ingest_raw');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_mapping_review'::regclass,'marquee_mapping_review');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_movies'::regclass,'marquee_movies');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_ratings'::regclass,'marquee_ratings');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_season_release_schedules'::regclass,'marquee_season_release_schedules');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_seasons'::regclass,'marquee_seasons');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_shows'::regclass,'marquee_shows');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_source_mappings'::regclass,'marquee_source_mappings');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_statuses'::regclass,'marquee_statuses');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_sync_runs'::regclass,'marquee_sync_runs');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_sync_state'::regclass,'marquee_sync_state');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_titles'::regclass,'marquee_titles');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_undated_completion_evidence'::regclass,'marquee_undated_completion_evidence');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_undated_completions'::regclass,'marquee_undated_completions');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_verified_season_totals'::regclass,'marquee_verified_season_totals');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_watch_date_decisions'::regclass,'marquee_watch_date_decisions');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_watch_history'::regclass,'marquee_watch_history');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_watch_history_sources'::regclass,'marquee_watch_history_sources');
SELECT barrier_marquee_legacy_live_20261001.register('public.marquee_watchlist'::regclass,'marquee_watchlist');
CREATE FUNCTION barrier_marquee_legacy_live_20261001.verify_binding() RETURNS void LANGUAGE plpgsql SET search_path='' AS $verify$
DECLARE item jsonb;target regclass;keys text[];actual_hash text;
BEGIN
IF (SELECT count(*) FROM barrier_marquee_legacy_live_20261001.registry)<>21 THEN RAISE EXCEPTION 'LEGACY_BINDING_COUNT';END IF;
FOR item IN SELECT value FROM jsonb_array_elements('[{"name":"marquee_episodes","pk":["id"],"shape_hash":"06504ff805fe7aef58ffdd0235862b8b","owner":"postgres"},{"name":"marquee_franchise_overrides","pk":["id"],"shape_hash":"6df2aca0e447f0e822b93322a9991c09","owner":"postgres"},{"name":"marquee_ingest_raw","pk":["id"],"shape_hash":"a31ed3bba79d127726690bb2c803b68e","owner":"postgres"},{"name":"marquee_mapping_review","pk":["id"],"shape_hash":"36031e8c6a4790273eec257ba78d08dd","owner":"postgres"},{"name":"marquee_movies","pk":["title_id"],"shape_hash":"499884b0305b46fdf64ca9f2695c1293","owner":"postgres"},{"name":"marquee_ratings","pk":["id"],"shape_hash":"bd4cac5bf7fa2761fc0bb5d289057e4e","owner":"postgres"},{"name":"marquee_season_release_schedules","pk":["season_id"],"shape_hash":"1c62d6066bfffa074c1ae6ef8059cbec","owner":"postgres"},{"name":"marquee_seasons","pk":["id"],"shape_hash":"716a119ced53c5980d053359a3bd477f","owner":"postgres"},{"name":"marquee_shows","pk":["title_id"],"shape_hash":"f9e0873f4aafb5ba346d2074dd3aa01f","owner":"postgres"},{"name":"marquee_source_mappings","pk":["id"],"shape_hash":"959232c62d38c57eda9c726ae6b57e34","owner":"postgres"},{"name":"marquee_statuses","pk":["id"],"shape_hash":"99d2a41d344a4a4a0718f57b5095c1bc","owner":"postgres"},{"name":"marquee_sync_runs","pk":["id"],"shape_hash":"66ea9711bdb8515a1cd9eb5d4a5d0227","owner":"postgres"},{"name":"marquee_sync_state","pk":["source","scope_key"],"shape_hash":"7757a6e9a92f44a0e2695978af63d5b4","owner":"postgres"},{"name":"marquee_titles","pk":["id"],"shape_hash":"8d9d77d58481540518d61bc04d431e12","owner":"postgres"},{"name":"marquee_undated_completion_evidence","pk":["id"],"shape_hash":"d20badd39afbbf3d3b7278668717f341","owner":"postgres"},{"name":"marquee_undated_completions","pk":["id"],"shape_hash":"4f027d8ac462efbf2b2652ddf1a7c37d","owner":"postgres"},{"name":"marquee_verified_season_totals","pk":["anilist_media_id"],"shape_hash":"c2ce3554ea71ba90a8fbabc0442e1069","owner":"postgres"},{"name":"marquee_watch_date_decisions","pk":["raw_id"],"shape_hash":"1223d15205f950bf13693ce56e093bfb","owner":"postgres"},{"name":"marquee_watch_history","pk":["id"],"shape_hash":"51a7e56743dbd19f377f3bd447626aa0","owner":"postgres"},{"name":"marquee_watch_history_sources","pk":["id"],"shape_hash":"4bf8de3a60a71b12f88ad62554df6032","owner":"postgres"},{"name":"marquee_watchlist","pk":["user_id","title_id"],"shape_hash":"ab0ea6ed3e38f5478d478a71598cc083","owner":"postgres"}]'::jsonb) LOOP
target=to_regclass('public.'||(item->>'name'));
SELECT array_agg(a.attname ORDER BY p.ord) INTO keys FROM pg_constraint k CROSS JOIN LATERAL unnest(k.conkey) WITH ORDINALITY p(num,ord) JOIN pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=p.num WHERE k.conrelid=target AND k.contype='p';
SELECT md5(jsonb_agg(jsonb_build_object('name',a.attname,'typeOid',a.atttypid,'typeMod',a.atttypmod,'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum)::text) INTO actual_hash FROM pg_attribute a WHERE a.attrelid=target AND a.attnum>0 AND NOT a.attisdropped;
IF target IS NULL OR to_jsonb(keys) IS DISTINCT FROM item->'pk' OR actual_hash IS DISTINCT FROM item->>'shape_hash' OR NOT EXISTS(SELECT 1 FROM barrier_marquee_legacy_live_20261001.registry WHERE relation=target AND logical_name=item->>'name' AND pk=keys) THEN RAISE EXCEPTION 'LEGACY_BINDING_DRIFT:%',item->>'name';END IF;
IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=target AND NOT tgisinternal AND tgenabled='O' AND ((tgname='migration_gate' AND tgfoid='barrier_marquee_legacy_live_20261001.gate()'::regprocedure AND tgtype=62) OR (tgname='migration_journal' AND tgfoid='barrier_marquee_legacy_live_20261001.record()'::regprocedure AND tgtype=29)))<>2 THEN RAISE EXCEPTION 'LEGACY_BINDING_TRIGGER_DRIFT';END IF;
END LOOP;END $verify$;
REVOKE ALL ON SCHEMA barrier_marquee_legacy_live_20261001 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA barrier_marquee_legacy_live_20261001 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA barrier_marquee_legacy_live_20261001 FROM PUBLIC,anon,authenticated,service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_legacy_live_20261001 FROM PUBLIC,anon,authenticated,service_role;
SELECT barrier_marquee_legacy_live_20261001.verify_binding();
SELECT barrier_marquee_legacy_live_20261001.pause();
-- Leave draining: physical DB writes are blocked; do not claim external effects/native jobs are drained.

COMMIT;
