-- Render {{S}} to a reviewed private schema. Never install on public without approval.
CREATE SCHEMA {{S}};
REVOKE ALL ON SCHEMA {{S}} FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA {{S}} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE {{S}}.control (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 app text NOT NULL, mode text NOT NULL DEFAULT 'open' CHECK(mode IN('open','draining','paused')),
 epoch bigint NOT NULL DEFAULT 0, paused_at timestamptz, abort_at timestamptz, deadline timestamptz,
 native_enabled boolean NOT NULL DEFAULT false, enrollment_enabled boolean NOT NULL DEFAULT false,
 dual_writes boolean NOT NULL DEFAULT true
);
INSERT INTO {{S}}.control(app) VALUES('{{APP}}');
CREATE TABLE {{S}}.registry (
 relation regclass PRIMARY KEY, logical_name text UNIQUE NOT NULL, pk text[] NOT NULL CHECK(cardinality(pk)>0)
);
CREATE TABLE {{S}}.journal (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, epoch bigint NOT NULL,
 xid bigint NOT NULL DEFAULT txid_current(), relation regclass NOT NULL,
 logical_name text NOT NULL, operation text NOT NULL CHECK(operation IN('INSERT','UPDATE','DELETE')),
 old_key jsonb, new_key jsonb, before_row jsonb, after_row jsonb, at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE {{S}}.receipts(batch_id text PRIMARY KEY,payload_hash text NOT NULL,changed bigint NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION {{S}}.gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c {{S}}.control%rowtype;
BEGIN
 -- The shared row lock lives until commit. A pause UPDATE waits for admitted writers.
 SELECT * INTO STRICT c FROM {{S}}.control WHERE id FOR SHARE;
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'TRUNCATE_NOT_JOURNALABLE' USING ERRCODE='55000'; END IF;
 IF c.mode<>'open' THEN RAISE EXCEPTION 'MIGRATION_WRITER_PAUSED' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION {{S}}.record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r {{S}}.registry%rowtype; b jsonb; a jsonb; bk jsonb; ak jsonb; e bigint;
BEGIN
 SELECT * INTO STRICT r FROM {{S}}.registry WHERE relation=TG_RELID;
 SELECT epoch INTO STRICT e FROM {{S}}.control WHERE id;
 IF TG_OP<>'INSERT' THEN b=to_jsonb(OLD); SELECT jsonb_agg(b->k ORDER BY ord) INTO bk FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF TG_OP<>'DELETE' THEN a=to_jsonb(NEW); SELECT jsonb_agg(a->k ORDER BY ord) INTO ak FROM unnest(r.pk) WITH ORDINALITY p(k,ord); END IF;
 IF b IS NOT DISTINCT FROM a THEN RETURN NULL; END IF;
 INSERT INTO {{S}}.journal(epoch,relation,logical_name,operation,old_key,new_key,before_row,after_row)
 VALUES(e,TG_RELID,r.logical_name,TG_OP,bk,ak,b,a);
 RETURN NULL;
END $$;
CREATE FUNCTION {{S}}.register(t regclass,logical text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE keys text[];
BEGIN
 SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_catalog.pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.attnum
 WHERE c.conrelid=t AND c.contype='p';
 IF keys IS NULL THEN RAISE EXCEPTION 'PRIMARY_KEY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=t AND attgenerated<>'') THEN RAISE EXCEPTION 'GENERATED_COLUMN_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=t AND NOT tgisinternal AND tgenabled<>'O') THEN RAISE EXCEPTION 'TRIGGER_MODE_REVIEW_REQUIRED'; END IF;
 INSERT INTO {{S}}.registry VALUES(t,logical,keys);
 EXECUTE format('CREATE TRIGGER migration_gate BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON %s FOR EACH STATEMENT EXECUTE FUNCTION {{S}}.gate()',t);
 EXECUTE format('CREATE TRIGGER migration_journal AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION {{S}}.record()',t);
END $$;
CREATE FUNCTION {{S}}.pause() RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c {{S}}.control%rowtype;
BEGIN
 -- Caller uses lock_timeout; never wait unboundedly for a long writer.
 UPDATE {{S}}.control SET mode='draining',epoch=epoch+1,paused_at=clock_timestamp(),
 abort_at=clock_timestamp()+interval '10 minutes',deadline=clock_timestamp()+interval '15 minutes'
 WHERE id AND mode='open' RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAUSE_ALREADY_ACTIVE'; END IF;
 RETURN to_jsonb(c);
END $$;
CREATE FUNCTION {{S}}.drained(running bigint,leases bigint,external_verified boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF running<>0 OR leases<>0 OR NOT external_verified THEN RAISE EXCEPTION 'WRITERS_NOT_DRAINED'; END IF;
 UPDATE {{S}}.control SET mode='paused' WHERE id AND mode='draining' AND clock_timestamp()<abort_at;
 IF NOT FOUND THEN RAISE EXCEPTION 'ABORT_DEADLINE_OR_WRONG_PHASE'; END IF;
END $$;
CREATE FUNCTION {{S}}.resume() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- No timer silently reopens writers during copy/rollback. The operator explicitly aborts/resumes.
 UPDATE {{S}}.control SET mode='open',paused_at=NULL,abort_at=NULL,deadline=NULL WHERE id;
END $$;
CREATE FUNCTION {{S}}.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r {{S}}.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt {{S}}.receipts%rowtype; payload_hash text;
BEGIN
 IF jsonb_typeof(changes)<>'array' THEN RAISE EXCEPTION 'INVALID_CHANGESET'; END IF;
 -- Excludes every admitted writer, and serializes apply/replay.
 PERFORM 1 FROM {{S}}.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 payload_hash=md5(changes::text);
 SELECT * INTO receipt FROM {{S}}.receipts WHERE batch_id=batch;
 IF FOUND THEN
  IF receipt.payload_hash<>payload_hash THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
  RETURN 0;
 END IF;
 -- Verify/lock all registered targets before disabling derivation triggers inside this transaction.
 FOR r IN SELECT * FROM {{S}}.registry ORDER BY relation::text LOOP
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',r.relation);
 END LOOP;
 FOR r IN SELECT * FROM {{S}}.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
  SELECT * INTO STRICT r FROM {{S}}.registry WHERE logical_name=item->>'table';
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
 FOR r IN SELECT * FROM {{S}}.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 INSERT INTO {{S}}.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA {{S}} FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA {{S}} FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA {{S}} FROM PUBLIC;
