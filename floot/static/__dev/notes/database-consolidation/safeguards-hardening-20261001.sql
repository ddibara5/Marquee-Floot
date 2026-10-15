-- Private-only engine hardening. Render a reviewed schema; never install on production without approval.
-- seal_journal(..., true) is UNDO, not a migration rollback. Transfer preserves before/after.
CREATE OR REPLACE FUNCTION {{S}}.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r {{S}}.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt {{S}}.receipts%rowtype; payload_hash text; identity_move boolean;
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
   SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=r.relation AND attidentity='a' AND (before_value->attname) IS DISTINCT FROM (after_value->attname)) INTO identity_move;
   IF identity_move THEN
    EXECUTE format('DELETE FROM %s t WHERE %s',r.relation,predicate) USING before_value;
    EXECUTE format('INSERT INTO %s OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::%s,$1)).*',r.relation,r.relation) USING after_value;
   ELSE
   SELECT string_agg(format('%I',attname),','),string_agg(format('%I=(jsonb_populate_record(NULL::%s,$2)).%I',attname,r.relation,attname),',')
   INTO columns,assignments FROM pg_catalog.pg_attribute WHERE attrelid=r.relation AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attidentity<>'a';
   EXECUTE format('UPDATE %s t SET %s WHERE %s',r.relation,assignments,predicate) USING before_value,after_value;
   END IF;
  END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE %s',r.relation,predicate) INTO existing USING coalesce(after_value,before_value);
  IF existing IS DISTINCT FROM after_value THEN RAISE EXCEPTION 'DELTA_POSTIMAGE_CONFLICT:%',r.logical_name; END IF;
  changed=changed+1;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR r IN SELECT * FROM {{S}}.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 INSERT INTO {{S}}.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;

CREATE OR REPLACE FUNCTION {{S}}.seal_rollback_transfer(batch text, lower_bound bigint)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $transfer$
DECLARE receipt jsonb;
BEGIN
receipt={{S}}.seal_journal(batch,lower_bound,false);
RETURN receipt||jsonb_build_object('purpose','native-to-retained-preserve-new-changes','undo',false);
END $transfer$;
CREATE OR REPLACE FUNCTION {{S}}.full_key_delta(source regclass,target regclass,logical text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $delta$
DECLARE r {{S}}.registry%rowtype; sc text[]; tc text[]; predicate text; key_columns text; null_predicate text; bad boolean; payload jsonb;
BEGIN
SELECT * INTO STRICT r FROM {{S}}.registry WHERE relation=target AND logical_name=logical;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO sc FROM pg_attribute WHERE attrelid=source AND attnum>0 AND NOT attisdropped;
SELECT array_agg(attname ORDER BY attname COLLATE "C") INTO tc FROM pg_attribute WHERE attrelid=target AND attnum>0 AND NOT attisdropped;
IF sc IS DISTINCT FROM tc THEN RAISE EXCEPTION 'SCHEMA_DRIFT_REVIEW_REQUIRED'; END IF;
SELECT string_agg(format('%I',k),','),string_agg(format('%I IS NULL',k),' OR '),string_agg(format('s.%I=t.%I',k,k),' AND ') INTO key_columns,null_predicate,predicate FROM unnest(r.pk) k;
EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE %s) OR EXISTS(SELECT 1 FROM %s GROUP BY %s HAVING count(*)>1)',source,null_predicate,source,key_columns) INTO bad;
IF bad THEN RAISE EXCEPTION 'SOURCE_KEY_COVERAGE_INVALID'; END IF;
EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',$1,''before'',to_jsonb(t),''after'',to_jsonb(s)) ORDER BY coalesce(to_jsonb(s),to_jsonb(t))::text COLLATE "C"),''[]''::jsonb) FROM %s s FULL JOIN %s t ON %s WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)',source,target,predicate) INTO payload USING logical;
RETURN payload;
END $delta$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA {{S}} FROM PUBLIC;