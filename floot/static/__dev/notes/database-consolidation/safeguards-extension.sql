-- Reviewed isolated safeguards extension; render {{S}} only after isolation review.
CREATE TABLE {{S}}.sealed_batches(batch_id text primary key,direction text not null check(direction in('forward','reverse')),lower_id bigint not null,upper_id bigint not null,payload jsonb not null,payload_hash text not null,created_at timestamptz not null default now());
CREATE TABLE {{S}}.writer_leases(id uuid primary key,kind text not null,epoch bigint not null,expires_at timestamptz not null,released_at timestamptz);
CREATE OR REPLACE FUNCTION {{S}}.gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c {{S}}.control%rowtype; admitted boolean=false; value text;
BEGIN
SELECT * INTO STRICT c FROM {{S}}.control WHERE id FOR SHARE;
IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
value=current_setting('migration.writer_lease',true);
IF c.mode='draining' AND value IS NOT NULL AND value~'^[0-9a-f-]{36}$' AND clock_timestamp()<c.abort_at THEN
SELECT EXISTS(SELECT 1 FROM {{S}}.writer_leases WHERE id=value::uuid AND released_at IS NULL AND expires_at>clock_timestamp() AND epoch=c.epoch-1) INTO admitted;
END IF;
IF c.mode<>'open' AND NOT admitted THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.drained(running bigint, leases bigint, external_verified boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
IF running<>0 OR leases<>0 OR NOT external_verified OR EXISTS(SELECT 1 FROM {{S}}.writer_leases WHERE released_at IS NULL) THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
UPDATE {{S}}.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.full_key_delta(source regclass, target regclass, logical text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r {{S}}.registry%rowtype; predicate text; payload jsonb; sc text[]; tc text[];
BEGIN
SELECT * INTO STRICT r FROM {{S}}.registry WHERE relation=target AND logical_name=logical;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO sc FROM pg_attribute WHERE attrelid=source AND attnum>0 AND NOT attisdropped;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO tc FROM pg_attribute WHERE attrelid=target AND attnum>0 AND NOT attisdropped;
IF sc IS DISTINCT FROM tc THEN RAISE EXCEPTION 'SCHEMA_DRIFT_REVIEW_REQUIRED'; END IF;
SELECT string_agg(format('s.%I=t.%I',k,k),' AND ') INTO predicate FROM unnest(r.pk) k;
EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',$1,''before'',to_jsonb(t),''after'',to_jsonb(s)) ORDER BY coalesce(to_jsonb(s),to_jsonb(t))::text COLLATE "C"),''[]''::jsonb) FROM %s s FULL JOIN %s t ON %s WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)',source,target,predicate) INTO payload USING logical;
RETURN payload;
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.seal_journal(batch text, lower_bound bigint, reverse_direction boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE upper_bound bigint; payload jsonb; direction_value text; old {{S}}.sealed_batches%rowtype;
BEGIN
PERFORM 1 FROM {{S}}.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
SELECT * INTO old FROM {{S}}.sealed_batches WHERE batch_id=batch;
IF FOUND THEN
IF old.lower_id<>lower_bound OR (old.direction='reverse')<>reverse_direction THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
RETURN jsonb_build_object('batch',batch,'lower',old.lower_id,'upper',old.upper_id,'changes',jsonb_array_length(old.payload),'hash',old.payload_hash,'reused',true);
END IF;
SELECT coalesce(max(id),0) INTO upper_bound FROM {{S}}.journal;
IF lower_bound<0 OR lower_bound>upper_bound THEN RAISE EXCEPTION 'INVALID_JOURNAL_BOUND'; END IF;
direction_value=CASE WHEN reverse_direction THEN 'reverse' ELSE 'forward' END;
SELECT coalesce(jsonb_agg(jsonb_build_object('table',logical_name,'before',CASE WHEN reverse_direction THEN after_row ELSE before_row END,'after',CASE WHEN reverse_direction THEN before_row ELSE after_row END) ORDER BY CASE WHEN reverse_direction THEN -id ELSE id END),'[]'::jsonb) INTO payload FROM {{S}}.journal WHERE id>lower_bound AND id<=upper_bound;
INSERT INTO {{S}}.sealed_batches VALUES(batch,direction_value,lower_bound,upper_bound,payload,md5(payload::text),now());
RETURN jsonb_build_object('batch',batch,'lower',lower_bound,'upper',upper_bound,'changes',jsonb_array_length(payload),'hash',md5(payload::text),'reused',false);
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.advance_sequences()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE r record; seq text; maximum bigint; previous bigint; advanced integer=0;
BEGIN
PERFORM 1 FROM {{S}}.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
FOR r IN SELECT reg.relation,a.attname FROM {{S}}.registry reg JOIN pg_attribute a ON a.attrelid=reg.relation WHERE a.attnum>0 AND NOT a.attisdropped LOOP
seq=pg_get_serial_sequence(r.relation::text,r.attname);
IF seq IS NULL THEN CONTINUE; END IF;
EXECUTE format('SELECT max(%I) FROM %s',r.attname,r.relation) INTO maximum;
EXECUTE format('SELECT last_value FROM %s',seq) INTO previous;
IF maximum IS NOT NULL AND maximum>previous THEN PERFORM setval(seq::regclass,maximum,true);advanced=advanced+1; END IF;
END LOOP;
RETURN advanced;
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.acquire_lease(lease_id uuid, writer_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE e bigint;
BEGIN
SELECT epoch INTO e FROM {{S}}.control WHERE id AND mode='open' FOR SHARE;
IF NOT FOUND THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED'; END IF;
INSERT INTO {{S}}.writer_leases VALUES(lease_id,writer_kind,e,clock_timestamp()+interval '9 minutes',NULL);
END $function$;

CREATE OR REPLACE FUNCTION {{S}}.release_lease(lease_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN UPDATE {{S}}.writer_leases SET released_at=clock_timestamp() WHERE id=lease_id AND released_at IS NULL; END $function$;

REVOKE ALL ON {{S}}.sealed_batches,{{S}}.writer_leases FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA {{S}} FROM PUBLIC;
