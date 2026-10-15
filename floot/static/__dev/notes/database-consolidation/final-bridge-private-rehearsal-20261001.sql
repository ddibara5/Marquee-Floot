DO $$ BEGIN IF to_regnamespace('exercise_marquee_bridge_20261001') IS NOT NULL OR to_regnamespace('barrier_marquee_bridge_20261001') IS NOT NULL THEN RAISE EXCEPTION 'PRESERVE_EXISTING_FIXTURE'; END IF; END $$;
CREATE SCHEMA exercise_marquee_bridge_20261001; CREATE SCHEMA barrier_marquee_bridge_20261001;
CREATE TABLE barrier_marquee_bridge_20261001.control(id boolean primary key,mode text,abort_at timestamptz);
INSERT INTO barrier_marquee_bridge_20261001.control VALUES(true,'paused',clock_timestamp()+interval '15 minutes');
CREATE TABLE barrier_marquee_bridge_20261001.registry(relation regclass primary key,logical_name text unique,pk text[]);
CREATE TABLE barrier_marquee_bridge_20261001.receipts(batch_id text primary key,payload_hash text,changed bigint,created_at timestamptz);
CREATE TABLE barrier_marquee_bridge_20261001.evidence(receipt_id uuid primary key,at timestamptz,result jsonb);
CREATE TABLE exercise_marquee_bridge_20261001.marquee_legacy_links(LIKE public.marquee_legacy_links INCLUDING ALL); INSERT INTO exercise_marquee_bridge_20261001.marquee_legacy_links SELECT * FROM public.marquee_legacy_links; INSERT INTO barrier_marquee_bridge_20261001.registry VALUES('exercise_marquee_bridge_20261001.marquee_legacy_links'::regclass,'marquee_legacy_links',ARRAY['entity_type','source_id']);
CREATE TABLE exercise_marquee_bridge_20261001.marquee_source_mappings(LIKE public.marquee_source_mappings INCLUDING ALL); INSERT INTO exercise_marquee_bridge_20261001.marquee_source_mappings SELECT * FROM public.marquee_source_mappings; INSERT INTO barrier_marquee_bridge_20261001.registry VALUES('exercise_marquee_bridge_20261001.marquee_source_mappings'::regclass,'marquee_source_mappings',ARRAY['source','source_entity_type','source_id']);
CREATE TABLE exercise_marquee_bridge_20261001.marquee_legacy_ratings(LIKE public.marquee_legacy_ratings INCLUDING ALL); INSERT INTO exercise_marquee_bridge_20261001.marquee_legacy_ratings SELECT * FROM public.marquee_legacy_ratings; INSERT INTO barrier_marquee_bridge_20261001.registry VALUES('exercise_marquee_bridge_20261001.marquee_legacy_ratings'::regclass,'marquee_legacy_ratings',ARRAY['source_id']);
CREATE OR REPLACE FUNCTION barrier_marquee_bridge_20261001.apply(batch text, changes jsonb) RETURNS bigint LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; r barrier_marquee_bridge_20261001.registry%rowtype; existing jsonb; predicate text; columns text; assignments text;
 before_value jsonb; after_value jsonb; changed bigint=0; receipt barrier_marquee_bridge_20261001.receipts%rowtype; payload_hash text; identity_move boolean;
BEGIN
 IF jsonb_typeof(changes)<>'array' THEN RAISE EXCEPTION 'INVALID_CHANGESET'; END IF;
 -- Excludes every admitted writer, and serializes apply/replay.
 PERFORM 1 FROM barrier_marquee_bridge_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FROZEN_WINDOW_REQUIRED'; END IF;
 payload_hash=md5(changes::text);
 SELECT * INTO receipt FROM barrier_marquee_bridge_20261001.receipts WHERE batch_id=batch;
 IF FOUND THEN
  IF receipt.payload_hash<>payload_hash THEN RAISE EXCEPTION 'REPLAY_PAYLOAD_CHANGED'; END IF;
  RETURN 0;
 END IF;
 -- Verify/lock all registered targets before disabling derivation triggers inside this transaction.
 FOR r IN SELECT * FROM barrier_marquee_bridge_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('LOCK TABLE %s IN ACCESS EXCLUSIVE MODE',r.relation);
 END LOOP;
 FOR r IN SELECT * FROM barrier_marquee_bridge_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER',r.relation);
 END LOOP;
 SET CONSTRAINTS ALL DEFERRED;
 FOR item IN SELECT value FROM jsonb_array_elements(changes) LOOP
  SELECT * INTO STRICT r FROM barrier_marquee_bridge_20261001.registry WHERE logical_name=item->>'table';
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
 FOR r IN SELECT * FROM barrier_marquee_bridge_20261001.registry ORDER BY relation::text LOOP
  EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER',r.relation);
 END LOOP;
 INSERT INTO barrier_marquee_bridge_20261001.receipts VALUES(batch,payload_hash,changed,now());
 RETURN changed;
END $$;


DO $test$
DECLARE h text; live_h text; n bigint; rejected boolean=false; receipt uuid=gen_random_uuid();
BEGIN
 h=(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_legacy_links t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_source_mappings t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_legacy_ratings t); live_h=(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_legacy_links t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_source_mappings t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_legacy_ratings t);
 n=barrier_marquee_bridge_20261001.apply('bridge-first','[{"table":"marquee_legacy_links","before":null,"after":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"}},{"table":"marquee_source_mappings","before":null,"after":{"source":"trakt","source_entity_type":"episode","source_id":"14210359","canonical_entity_type":"episode","title_id":null,"season_id":null,"episode_id":287,"match_method":"external_id","rule_id":null,"confidence":null,"manual_locked":false,"notes":null,"legacy_id":"02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa"}},{"table":"marquee_legacy_ratings","before":null,"after":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":9,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"}}]'::jsonb); IF n<>3 THEN RAISE EXCEPTION 'EXPECTED_THREE_ADDITIONS'; END IF;
 n=barrier_marquee_bridge_20261001.apply('bridge-first','[{"table":"marquee_legacy_links","before":null,"after":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"}},{"table":"marquee_source_mappings","before":null,"after":{"source":"trakt","source_entity_type":"episode","source_id":"14210359","canonical_entity_type":"episode","title_id":null,"season_id":null,"episode_id":287,"match_method":"external_id","rule_id":null,"confidence":null,"manual_locked":false,"notes":null,"legacy_id":"02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa"}},{"table":"marquee_legacy_ratings","before":null,"after":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":9,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"}}]'::jsonb); IF n<>0 THEN RAISE EXCEPTION 'REPLAY_CHANGED_ROWS'; END IF;
 BEGIN PERFORM barrier_marquee_bridge_20261001.apply('bridge-late-conflict','[{"table":"marquee_legacy_links","before":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"},"after":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"private-late-conflict-sentinel"}},{"table":"marquee_legacy_ratings","before":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":0,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"},"after":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":8,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"}}]'::jsonb);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'DELTA_CONFLICT:%' THEN rejected=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'LATE_CONFLICT_NOT_REJECTED'; END IF;
 IF (SELECT match_method FROM exercise_marquee_bridge_20261001.marquee_legacy_links WHERE entity_type='episode' AND source_id='8d0d1efa-b0d5-4614-aca7-9c7225cf3676')<>'legacy-season-and-exact-Trakt-id' THEN RAISE EXCEPTION 'PARTIAL_CHANGE_AFTER_CONFLICT'; END IF;
 n=barrier_marquee_bridge_20261001.apply('bridge-reverse','[{"table":"marquee_legacy_links","before":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"},"after":null},{"table":"marquee_source_mappings","before":{"source":"trakt","source_entity_type":"episode","source_id":"14210359","canonical_entity_type":"episode","title_id":null,"season_id":null,"episode_id":287,"match_method":"external_id","rule_id":null,"confidence":null,"manual_locked":false,"notes":null,"legacy_id":"02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa"},"after":null},{"table":"marquee_legacy_ratings","before":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":9,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"},"after":null}]'::jsonb); IF n<>3 OR h IS DISTINCT FROM (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_legacy_links t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_source_mappings t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from exercise_marquee_bridge_20261001.marquee_legacy_ratings t) THEN RAISE EXCEPTION 'EXACT_REVERSE_FAILED'; END IF;
 n=barrier_marquee_bridge_20261001.apply('bridge-final-retained','[{"table":"marquee_legacy_links","before":null,"after":{"entity_type":"episode","source_id":"8d0d1efa-b0d5-4614-aca7-9c7225cf3676","local_id":287,"match_method":"legacy-season-and-exact-Trakt-id"}},{"table":"marquee_source_mappings","before":null,"after":{"source":"trakt","source_entity_type":"episode","source_id":"14210359","canonical_entity_type":"episode","title_id":null,"season_id":null,"episode_id":287,"match_method":"external_id","rule_id":null,"confidence":null,"manual_locked":false,"notes":null,"legacy_id":"02ff8ac5-71d9-41b9-baee-5b3d9d7c29fa"}},{"table":"marquee_legacy_ratings","before":null,"after":{"source_id":"6e7df7bb-99db-4d2c-a0eb-add526e9bb78","user_id":1,"title_id":6,"season_id":null,"score":9,"source":"trakt","source_record_id":"180770","manual_locked":false,"source_updated_at":"2026-09-30T01:48:22+00:00"}}]'::jsonb); IF n<>3 THEN RAISE EXCEPTION 'FINAL_FIXTURE_FAILED'; END IF;
 IF live_h IS DISTINCT FROM (select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_legacy_links t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_source_mappings t)||(select md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by to_jsonb(t)::text COLLATE "C"),'')) from public.marquee_legacy_ratings t) THEN RAISE EXCEPTION 'PUBLIC_ROWS_CHANGED'; END IF;
 UPDATE barrier_marquee_bridge_20261001.control SET mode='open',abort_at=NULL;
 INSERT INTO barrier_marquee_bridge_20261001.evidence VALUES(receipt,clock_timestamp(),jsonb_build_object('private_only',true,'three_additions',true,'zero_change_replay',true,'late_conflict_atomic',true,'exact_reverse',true,'public_bridge_tables_unchanged',true,'provider_effects',false,'full_production_rollback_proven',false));
END $test$;
SELECT * FROM barrier_marquee_bridge_20261001.evidence;