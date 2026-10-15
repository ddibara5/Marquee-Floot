BEGIN;SET LOCAL statement_timeout='120s';CREATE SCHEMA exercise_marquee_runner_20261001; REVOKE ALL ON SCHEMA exercise_marquee_runner_20261001 FROM PUBLIC;
DO $clone$ DECLARE item text;r record;seq text;mx bigint;BEGIN
 FOREACH item IN ARRAY ARRAY['users','sessions','user_passwords','login_attempts','marquee_titles','marquee_seasons','marquee_episodes','marquee_watch_events','marquee_manual_title_statuses','marquee_episode_unwatched','marquee_manual_trakt_outbox','marquee_trakt_oauth','marquee_import_runs','marquee_import_controls','marquee_crunchyroll_raw','marquee_crunchyroll_review','marquee_crunchyroll_sync_runs','marquee_crunchyroll_sync_state','marquee_import_backups','marquee_import_pages','marquee_legacy_completions','marquee_legacy_import','marquee_legacy_links','marquee_legacy_ratings','marquee_legacy_statuses','marquee_legacy_watchlist','marquee_manual_episode_completions','marquee_series_catchup_corrections','marquee_source_mappings','marquee_title_aliases','marquee_title_progress_baseline','marquee_title_watch_events','marquee_tmdb_mappings','marquee_tmdb_refresh_state','marquee_trakt_device_auth','marquee_trakt_mappings','marquee_trakt_pending','marquee_trakt_personal_sync_state','marquee_trakt_ratings','marquee_trakt_sync_runs','marquee_trakt_sync_state','marquee_trakt_watchlist'] LOOP
 EXECUTE format('CREATE TABLE exercise_marquee_runner_20261001.%I (LIKE public.%I INCLUDING ALL)',item,item);
 FOR r IN SELECT a.attname,pg_get_expr(d.adbin,d.adrelid) expr FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=('exercise_marquee_runner_20261001.'||item)::regclass AND a.attidentity='' LOOP
  IF r.expr LIKE 'nextval(%' THEN seq='exercise_marquee_runner_20261001.'||item||'_'||r.attname||'_private_seq'; EXECUTE format('CREATE SEQUENCE %s',seq); EXECUTE format('ALTER TABLE exercise_marquee_runner_20261001.%I ALTER COLUMN %I SET DEFAULT nextval(%L::regclass)',item,r.attname,seq); EXECUTE format('ALTER SEQUENCE %s OWNED BY exercise_marquee_runner_20261001.%I.%I',seq,item,r.attname); END IF;
 END LOOP;
 EXECUTE format('INSERT INTO exercise_marquee_runner_20261001.%I OVERRIDING SYSTEM VALUE SELECT * FROM public.%I',item,item);
 FOR r IN SELECT a.attname FROM pg_attribute a WHERE a.attrelid=('exercise_marquee_runner_20261001.'||item)::regclass AND a.attnum>0 AND NOT a.attisdropped LOOP
  seq=pg_get_serial_sequence('exercise_marquee_runner_20261001.'||item,r.attname); IF seq IS NOT NULL THEN
   IF (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=seq::regclass) <> 'exercise_marquee_runner_20261001' THEN RAISE EXCEPTION 'PRIVATE_SEQUENCE_REQUIRED'; END IF;
   EXECUTE format('SELECT max(%I) FROM exercise_marquee_runner_20261001.%I',r.attname,item) INTO mx; IF mx IS NOT NULL THEN PERFORM setval(seq::regclass,greatest(mx,1),true); END IF;
  END IF;
 END LOOP;
 EXECUTE format('ALTER TABLE exercise_marquee_runner_20261001.%I ENABLE ROW LEVEL SECURITY',item);
 END LOOP;
END $clone$;
REVOKE ALL ON ALL TABLES IN SCHEMA exercise_marquee_runner_20261001 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA exercise_marquee_runner_20261001 FROM PUBLIC;-- Render barrier_marquee_runner_20261001 to a reviewed private schema. Never install on public without approval.
CREATE SCHEMA barrier_marquee_runner_20261001;
REVOKE ALL ON SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA barrier_marquee_runner_20261001 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE barrier_marquee_runner_20261001.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 app text NOT NULL, mode text NOT NULL DEFAULT 'open' CHECK(mode IN('open','draining','paused')),
 epoch bigint NOT NULL DEFAULT 0, paused_at timestamptz, abort_at timestamptz, deadline timestamptz,
 native_enabled boolean NOT NULL DEFAULT false, enrollment_enabled boolean NOT NULL DEFAULT false,
 dual_writes boolean NOT NULL DEFAULT true
);
INSERT INTO barrier_marquee_runner_20261001.control(app) VALUES('marquee');
CREATE TABLE barrier_marquee_runner_20261001.registry (
 relation regclass PRIMARY KEY, logical_name text UNIQUE NOT NULL, pk text[] NOT NULL CHECK(cardinality(pk)>0)
);
CREATE TABLE barrier_marquee_runner_20261001.journal (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, epoch bigint NOT NULL,
 xid bigint NOT NULL DEFAULT txid_current(), relation regclass NOT NULL,
 logical_name text NOT NULL, operation text NOT NULL CHECK(operation IN('INSERT','UPDATE','DELETE')),
 old_key jsonb, new_key jsonb, before_row jsonb, after_row jsonb, at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE barrier_marquee_runner_20261001.receipts(batch_id text PRIMARY KEY,payload_hash text NOT NULL,changed bigint NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION barrier_marquee_runner_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c barrier_marquee_runner_20261001.control%rowtype;
BEGIN
 -- The shared row lock lives until commit. A pause UPDATE waits for admitted writers.
 SELECT * INTO STRICT c FROM barrier_marquee_runner_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 IF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r barrier_marquee_runner_20261001.registry%rowtype; b jsonb; a jsonb; bk jsonb; ak jsonb; e bigint;
BEGIN
 SELECT * INTO STRICT r FROM barrier_marquee_runner_20261001.registry WHERE relation=TG_RELID;
 SELECT epoch INTO STRICT e FROM barrier_marquee_runner_20261001.control WHERE id;
 IF TG_OP<>'INSERT' THEN b=to_jsonb(OLD); SELECT jsonb_agg(b->k ORDER BY ord) INTO bk FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF TG_OP<>'DELETE' THEN a=to_jsonb(NEW); SELECT jsonb_agg(a->k ORDER BY ord) INTO ak FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 INSERT INTO barrier_marquee_runner_20261001.journal(epoch,relation,logical_name,operation,old_key,new_key,before_row,after_row)
 VALUES(e,TG_RELID,r.logical_name,TG_OP,bk,ak,b,a);
 RETURN NULL;
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.register(t regclass,logical text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE keys text[];
BEGIN
 SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_catalog.pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.attnum
 WHERE c.conrelid=t AND c.contype='p';
 IF keys IS NULL THEN RAISE EXCEPTION 'PRIMARY_KEY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=t AND attgenerated<>'') THEN RAISE EXCEPTION 'GENERATED_COLUMN_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=t AND NOT tgisinternal AND tgenabled<>'O') THEN RAISE EXCEPTION 'TRIGGER_MODE_REVIEW_REQUIRED'; END IF;
 INSERT INTO barrier_marquee_runner_20261001.registry VALUES(t,logical,keys);
 EXECUTE format('CREATE TRIGGER migration_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION barrier_marquee_runner_20261001.gate()',t);
 EXECUTE format('CREATE TRIGGER migration_journal AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION barrier_marquee_runner_20261001.record()',t);
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.pause() RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c barrier_marquee_runner_20261001.control%rowtype;
BEGIN
 -- Caller uses lock_timeout; never wait unboundedly for a long writer.
 UPDATE barrier_marquee_runner_20261001.control SET mode='draining',epoch=epoch+1,paused_at=clock_timestamp(),
 abort_at=clock_timestamp()+interval '10 minutes',deadline=clock_timestamp()+interval '15 minutes'
 WHERE id AND mode='open' RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAUSE_ALREADY_ACTIVE'; END IF;
 RETURN to_jsonb(c);
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.drained(running bigint,leases bigint,external_verified boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF running<>0 OR leases<>0 OR NOT external_verified THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
 UPDATE barrier_marquee_runner_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.resume() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- No timer silently reopens writers during copy/rollback. The operator explicitly aborts/resumes.
 UPDATE barrier_marquee_runner_20261001.control SET mode='open',paused_at=NULL,abort_at=NULL,deadline=NULL WHERE id;
END $$;
CREATE FUNCTION barrier_marquee_runner_20261001.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r barrier_marquee_runner_20261001.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt barrier_marquee_runner_20261001.receipts%rowtype; payload_hash text;
BEGIN
 IF jsonb_typeof(changes)<>'array' THEN RAISE EXCEPTION 'INVALID_CHANGESET'; END IF;
 -- Excludes every admitted writer, and serializes apply/replay.
 PERFORM 1 FROM barrier_marquee_runner_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 payload_hash=md5(changes::text);
 SELECT * INTO receipt FROM barrier_marquee_runner_20261001.receipts WHERE batch_id=batch;
 IF FOUND THEN
  IF receipt.payload_hash<>payload_hash THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
  RETURN 0;
 END IF;
 -- Verify/lock all registered targets before disabling derivation triggers inside this transaction.
 FOR r IN SELECT * FROM barrier_marquee_runner_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',r.relation);
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_runner_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
  SELECT * INTO STRICT r FROM barrier_marquee_runner_20261001.registry WHERE logical_name=item->>'table';
  before_value=item->'before'; after_value=item->'after';
  IF before_value='null'::jsonb THEN before_value=NULL; END IF;
  IF after_value='null'::jsonb THEN after_value=NULL; END IF;
  IF before_value IS NULL AND after_value IS NULL THEN RAISE EXCEPTION 'EMPTY_CHANGE'; END IF;
  SELECT string_agg(format('t.%I IS NOT DISTINCT FROM (jsonb_populate_record(NULL::%s,$1)).%I',k,r.relation,k),' AND ') INTO predicate FROM unnest(r.pk) k;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE %s FOR UPDATE',r.relation,predicate)
  INTO existing USING coalesce(before_value,after_value);
  IF existing IS NOT DISTINCT FROM after_value THEN CONTINUE; END IF;
  IF existing IS DISTINCT FROM before_value THEN RAISE EXCEPTION 'DELTA_CONFLICT:%',r.logical_name; END IF;
  IF after_value IS NULL THEN
   EXECUTE format('DELETE FROM %s t WHERE %s',r.relation,predicate) USING before_value;
  ELSIF before_value IS NULL THEN
   EXECUTE format('INSERT INTO %s OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::%s,$1)).*',r.relation,r.relation) USING after_value;
  ELSE
   SELECT string_agg(format('%I',attname),','),string_agg(format('%I=(jsonb_populate_record(NULL::%s,$2)).%I',attname,r.relation,attname),',')
   INTO columns,assignments FROM pg_catalog.pg_attribute WHERE attrelid=r.relation AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attidentity<>'a';
   EXECUTE format('UPDATE %s t SET %s WHERE %s',r.relation,assignments,predicate) USING before_value,after_value;
  END IF;
  changed=changed+1;
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_runner_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 INSERT INTO barrier_marquee_runner_20261001.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
-- Reviewed isolated safeguards extension; render barrier_marquee_runner_20261001 only after isolation review.
CREATE TABLE barrier_marquee_runner_20261001.sealed_batches(batch_id text primary key,direction text not null check(direction in('forward','reverse')),lower_id bigint not null,upper_id bigint not null,payload jsonb not null,payload_hash text not null,created_at timestamptz not null default now());
CREATE TABLE barrier_marquee_runner_20261001.writer_leases(id uuid primary key,kind text not null,epoch bigint not null,expires_at timestamptz not null,released_at timestamptz);
CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c barrier_marquee_runner_20261001.control%rowtype; admitted boolean=false; value text;
BEGIN
SELECT * INTO STRICT c FROM barrier_marquee_runner_20261001.control WHERE id FOR SHARE;
IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
value=current_setting('migration.writer_lease',true);
IF c.mode='draining' AND value IS NOT NULL AND value~'^[0-9a-f-]{36}$' AND clock_timestamp()<c.abort_at THEN
SELECT EXISTS(SELECT 1 FROM barrier_marquee_runner_20261001.writer_leases WHERE id=value::uuid AND released_at IS NULL AND expires_at>clock_timestamp() AND epoch=c.epoch-1) INTO admitted;
END IF;
IF c.mode<>'open' AND NOT admitted THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.drained(running bigint, leases bigint, external_verified boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
IF running<>0 OR leases<>0 OR NOT external_verified OR EXISTS(SELECT 1 FROM barrier_marquee_runner_20261001.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
UPDATE barrier_marquee_runner_20261001.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.full_key_delta(source regclass, target regclass, logical text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r barrier_marquee_runner_20261001.registry%rowtype; predicate text; payload jsonb; sc text[]; tc text[];
BEGIN
SELECT * INTO STRICT r FROM barrier_marquee_runner_20261001.registry WHERE relation=target AND logical_name=logical;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO sc FROM pg_attribute WHERE attrelid=source AND attnum>0 AND NOT attisdropped;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO tc FROM pg_attribute WHERE attrelid=target AND attnum>0 AND NOT attisdropped;
IF sc IS DISTINCT FROM tc THEN RAISE EXCEPTION 'SCHEMA_DRIFT_REVIEW_REQUIRED'; END IF;
SELECT string_agg(format('s.%I=t.%I',k,k),' AND ') INTO predicate FROM unnest(r.pk) k;
EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',$1,''before'',to_jsonb(t),''after'',to_jsonb(s)) ORDER BY coalesce(to_jsonb(s),to_jsonb(t))::text COLLATE "C"),''[]''::jsonb) FROM %s s FULL JOIN %s t ON %s WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)',source,target,predicate) INTO payload USING logical;
RETURN payload;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.seal_journal(batch text, lower_bound bigint, reverse_direction boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE upper_bound bigint; payload jsonb; direction_value text; old barrier_marquee_runner_20261001.sealed_batches%rowtype;
BEGIN
PERFORM 1 FROM barrier_marquee_runner_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
SELECT * INTO old FROM barrier_marquee_runner_20261001.sealed_batches WHERE batch_id=batch;
IF FOUND THEN
IF old.lower_id<>lower_bound OR (old.direction='reverse')<>reverse_direction THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
RETURN jsonb_build_object('batch',batch,'lower',old.lower_id,'upper',old.upper_id,'changes',jsonb_array_length(old.payload),'hash',old.payload_hash,'reused',true);
END IF;
SELECT coalesce(max(id),0) INTO upper_bound FROM barrier_marquee_runner_20261001.journal;
IF lower_bound<0 OR lower_bound>upper_bound THEN RAISE EXCEPTION 'INVALID_JOURNAL_BOUND'; END IF;
direction_value=CASE WHEN reverse_direction THEN 'reverse' ELSE 'forward' END;
SELECT coalesce(jsonb_agg(jsonb_build_object('table',logical_name,'before',CASE WHEN reverse_direction THEN after_row ELSE before_row END,'after',CASE WHEN reverse_direction THEN before_row ELSE after_row END) ORDER BY CASE WHEN reverse_direction THEN -id ELSE id END),'[]'::jsonb) INTO payload FROM barrier_marquee_runner_20261001.journal WHERE id>lower_bound AND id<=upper_bound;
INSERT INTO barrier_marquee_runner_20261001.sealed_batches VALUES(batch,direction_value,lower_bound,upper_bound,payload,md5(payload::text),now());
RETURN jsonb_build_object('batch',batch,'lower',lower_bound,'upper',upper_bound,'changes',jsonb_array_length(payload),'hash',md5(payload::text),'reused',false);
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.advance_sequences()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r record; seq text; maximum bigint; previous bigint; advanced integer=0;
BEGIN
PERFORM 1 FROM barrier_marquee_runner_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
FOR r IN SELECT reg.relation,a.attname FROM barrier_marquee_runner_20261001.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
seq=pg_get_serial_sequence(r.relation::text,r.attname);
IF seq IS NULL THEN CONTINUE; END IF;
EXECUTE format('SELECT max(%I) FROM %s',r.attname,r.relation) INTO maximum;
EXECUTE format('SELECT last_value FROM %s',seq) INTO previous;
IF maximum IS NOT NULL AND maximum>previous THEN PERFORM setval(seq::regclass,maximum,true);advanced=advanced+1; END IF;
END LOOP;
RETURN advanced;
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.acquire_lease(lease_id uuid, writer_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE e bigint;
BEGIN
SELECT epoch INTO e FROM barrier_marquee_runner_20261001.control WHERE id AND mode='open' FOR SHARE;
IF NOT FOUND THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED'; END IF;
INSERT INTO barrier_marquee_runner_20261001.writer_leases VALUES(lease_id,writer_kind,e,clock_timestamp()+interval '9 minutes',NULL);
END $function$;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.release_lease(lease_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN UPDATE barrier_marquee_runner_20261001.writer_leases SET released_at=clock_timestamp() WHERE id=lease_id AND released_at IS NULL; END $function$;

REVOKE ALL ON barrier_marquee_runner_20261001.sealed_batches,barrier_marquee_runner_20261001.writer_leases FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
-- This file is inert. Render only a reviewed private barrier schema during preparation.
CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.admit(lease_id uuid DEFAULT NULL, terminal boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c barrier_marquee_runner_20261001.control%rowtype; l barrier_marquee_runner_20261001.writer_leases%rowtype;
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','25s',true);
 SELECT * INTO STRICT c FROM barrier_marquee_runner_20261001.control WHERE id FOR SHARE;
 IF c.mode='paused' OR (c.mode='draining' AND clock_timestamp()>=c.abort_at) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 IF lease_id IS NOT NULL THEN
  SELECT * INTO l FROM barrier_marquee_runner_20261001.writer_leases WHERE id=lease_id FOR SHARE;
  IF NOT FOUND OR l.released_at IS NOT NULL OR l.epoch<>(CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END)
     OR (NOT terminal AND l.expires_at<=clock_timestamp()) THEN
   RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000';
  END IF;

 ELSIF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 PERFORM set_config('migration.writer_lease',coalesce(lease_id::text,''),true);
 PERFORM set_config('migration.writer_terminal',terminal::text,true);
END $$;
CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c barrier_marquee_runner_20261001.control%rowtype; admitted boolean=false; value text; terminal boolean;
BEGIN
 SELECT * INTO STRICT c FROM barrier_marquee_runner_20261001.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 value=current_setting('migration.writer_lease',true);
 terminal=coalesce(current_setting('migration.writer_terminal',true),'false')='true';
 IF terminal AND TG_TABLE_NAME NOT IN ('gamedeck_import_runs','gamedeck_import_controls','gamedeck_import_leases','marquee_import_runs','marquee_import_controls') THEN
  RAISE EXCEPTION 'TERMINAL_WRITER_TABLE_DENIED' USING ERRCODE='55000';
 END IF;
 IF value IS NOT NULL AND value<>'' THEN
  SELECT EXISTS(SELECT 1 FROM barrier_marquee_runner_20261001.writer_leases WHERE id=value::uuid AND released_at IS NULL
    AND (terminal OR expires_at>clock_timestamp()) AND epoch=CASE WHEN c.mode='draining' THEN c.epoch-1 ELSE c.epoch END) INTO admitted;
  IF NOT admitted THEN RAISE EXCEPTION 'MIGRATION_LEASE_LOST' USING ERRCODE='55000'; END IF;
 END IF;
 IF c.mode='paused' OR (c.mode='draining' AND (NOT admitted OR clock_timestamp()>=c.abort_at)) THEN
  RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000';
 END IF;
 RETURN NULL;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;

CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.advance_sequences() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; seq text; maximum bigint; previous bigint; called boolean; advanced integer=0; ns text;
BEGIN
 PERFORM 1 FROM barrier_marquee_runner_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 FOR r IN SELECT reg.relation,a.attname FROM barrier_marquee_runner_20261001.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
  seq=pg_get_serial_sequence(r.relation::text,r.attname); IF seq IS NULL THEN CONTINUE; END IF;
  SELECT n.nspname INTO ns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=seq::regclass;
  IF ns='public' OR ns='auth' THEN RAISE EXCEPTION 'PRIVATE_SEQUENCE_REQUIRED'; END IF;
  EXECUTE format('SELECT max(%I) FROM %s',r.attname,r.relation) INTO maximum;
  EXECUTE format('SELECT last_value,is_called FROM %s',seq) INTO previous,called;
  IF maximum IS NOT NULL AND (maximum>previous OR (maximum=previous AND NOT called)) THEN
   PERFORM setval(seq::regclass,maximum,true);advanced=advanced+1;
  END IF;
 END LOOP; RETURN advanced;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA barrier_marquee_runner_20261001 FROM PUBLIC;
-- Inert engine extension. Render a reviewed barrier; no production table is altered by this file.
CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.require_binding(expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item record; target regclass; keys text[]; n integer;
BEGIN
 IF jsonb_typeof(expected)<>'object' OR expected='{}'::jsonb THEN RAISE EXCEPTION 'MIGRATION_BINDING_INVALID'; END IF;
 SELECT count(*) INTO n FROM jsonb_object_keys(expected);
 IF n<>(SELECT count(*) FROM barrier_marquee_runner_20261001.registry) OR n<>(SELECT count(DISTINCT value) FROM jsonb_each_text(expected)) THEN RAISE EXCEPTION 'MIGRATION_BINDING_INCOMPLETE'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(expected) LOOP
  target=to_regclass(item.value);
  IF target IS NULL OR NOT EXISTS(SELECT 1 FROM barrier_marquee_runner_20261001.registry WHERE logical_name=item.key AND relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_MISMATCH'; END IF;
  SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.num WHERE c.conrelid=target AND c.contype='p';
  IF keys IS NULL OR keys IS DISTINCT FROM (SELECT pk FROM barrier_marquee_runner_20261001.registry WHERE relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_KEY_MISMATCH'; END IF;
  SELECT count(*) INTO n FROM pg_trigger WHERE tgrelid=target AND NOT tgisinternal AND tgenabled='O' AND (
   (tgname='migration_gate' AND tgfoid='barrier_marquee_runner_20261001.gate()'::regprocedure AND tgtype=62) OR
   (tgname='migration_journal' AND tgfoid='barrier_marquee_runner_20261001.record()'::regprocedure AND tgtype=29));
  IF n<>2 THEN RAISE EXCEPTION 'MIGRATION_BINDING_TRIGGER_MISMATCH'; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION barrier_marquee_runner_20261001.admit_bound(lease_id uuid,terminal boolean,expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM barrier_marquee_runner_20261001.admit(lease_id,terminal);
 PERFORM barrier_marquee_runner_20261001.require_binding(expected);
END $$;
REVOKE EXECUTE ON FUNCTION barrier_marquee_runner_20261001.require_binding(jsonb),barrier_marquee_runner_20261001.admit_bound(uuid,boolean,jsonb) FROM PUBLIC; SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.users'::regclass,'users');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.sessions'::regclass,'sessions');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.user_passwords'::regclass,'user_passwords');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.login_attempts'::regclass,'login_attempts');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_titles'::regclass,'marquee_titles');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_seasons'::regclass,'marquee_seasons');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_episodes'::regclass,'marquee_episodes');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_watch_events'::regclass,'marquee_watch_events');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_manual_title_statuses'::regclass,'marquee_manual_title_statuses');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_episode_unwatched'::regclass,'marquee_episode_unwatched');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_manual_trakt_outbox'::regclass,'marquee_manual_trakt_outbox');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_oauth'::regclass,'marquee_trakt_oauth');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_import_runs'::regclass,'marquee_import_runs');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_import_controls'::regclass,'marquee_import_controls');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_crunchyroll_raw'::regclass,'marquee_crunchyroll_raw');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_crunchyroll_review'::regclass,'marquee_crunchyroll_review');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_crunchyroll_sync_runs'::regclass,'marquee_crunchyroll_sync_runs');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_crunchyroll_sync_state'::regclass,'marquee_crunchyroll_sync_state');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_import_backups'::regclass,'marquee_import_backups');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_import_pages'::regclass,'marquee_import_pages');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_completions'::regclass,'marquee_legacy_completions');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_import'::regclass,'marquee_legacy_import');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_links'::regclass,'marquee_legacy_links');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_ratings'::regclass,'marquee_legacy_ratings');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_statuses'::regclass,'marquee_legacy_statuses');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_legacy_watchlist'::regclass,'marquee_legacy_watchlist');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_manual_episode_completions'::regclass,'marquee_manual_episode_completions');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_series_catchup_corrections'::regclass,'marquee_series_catchup_corrections');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_source_mappings'::regclass,'marquee_source_mappings');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_title_aliases'::regclass,'marquee_title_aliases');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_title_progress_baseline'::regclass,'marquee_title_progress_baseline');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_title_watch_events'::regclass,'marquee_title_watch_events');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_tmdb_mappings'::regclass,'marquee_tmdb_mappings');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_tmdb_refresh_state'::regclass,'marquee_tmdb_refresh_state');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_device_auth'::regclass,'marquee_trakt_device_auth');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_mappings'::regclass,'marquee_trakt_mappings');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_pending'::regclass,'marquee_trakt_pending');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_personal_sync_state'::regclass,'marquee_trakt_personal_sync_state');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_ratings'::regclass,'marquee_trakt_ratings');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_sync_runs'::regclass,'marquee_trakt_sync_runs');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_sync_state'::regclass,'marquee_trakt_sync_state');
SELECT barrier_marquee_runner_20261001.register('exercise_marquee_runner_20261001.marquee_trakt_watchlist'::regclass,'marquee_trakt_watchlist');CREATE TABLE exercise_marquee_runner_20261001.runner_evidence(id uuid primary key,proof jsonb,at timestamptz default now()); COMMIT;