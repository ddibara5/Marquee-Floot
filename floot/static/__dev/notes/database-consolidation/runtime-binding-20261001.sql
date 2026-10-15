-- Inert engine extension. Render a reviewed barrier; no production table is altered by this file.
CREATE OR REPLACE FUNCTION {{B}}.require_binding(expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item record; target regclass; keys text[]; n integer;
BEGIN
 IF jsonb_typeof(expected)<>'object' OR expected='{}'::jsonb THEN RAISE EXCEPTION 'MIGRATION_BINDING_INVALID'; END IF;
 SELECT count(*) INTO n FROM jsonb_object_keys(expected);
 IF n<>(SELECT count(*) FROM {{B}}.registry) OR n<>(SELECT count(DISTINCT value) FROM jsonb_each_text(expected)) THEN RAISE EXCEPTION 'MIGRATION_BINDING_INCOMPLETE'; END IF;
 FOR item IN SELECT key,value FROM jsonb_each_text(expected) LOOP
  target=to_regclass(item.value);
  IF target IS NULL OR NOT EXISTS(SELECT 1 FROM {{B}}.registry WHERE logical_name=item.key AND relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_MISMATCH'; END IF;
  SELECT array_agg(a.attname ORDER BY ord) INTO keys FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY p(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=p.num WHERE c.conrelid=target AND c.contype='p';
  IF keys IS NULL OR keys IS DISTINCT FROM (SELECT pk FROM {{B}}.registry WHERE relation=target) THEN RAISE EXCEPTION 'MIGRATION_BINDING_KEY_MISMATCH'; END IF;
  SELECT count(*) INTO n FROM pg_trigger WHERE tgrelid=target AND NOT tgisinternal AND tgenabled='O' AND (
   (tgname='migration_gate' AND tgfoid='{{B}}.gate()'::regprocedure AND tgtype=62) OR
   (tgname='migration_journal' AND tgfoid='{{B}}.record()'::regprocedure AND tgtype=29));
  IF n<>2 THEN RAISE EXCEPTION 'MIGRATION_BINDING_TRIGGER_MISMATCH'; END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION {{B}}.admit_bound(lease_id uuid,terminal boolean,expected jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM {{B}}.admit(lease_id,terminal);
 PERFORM {{B}}.require_binding(expected);
END $$;
REVOKE EXECUTE ON FUNCTION {{B}}.require_binding(jsonb),{{B}}.admit_bound(uuid,boolean,jsonb) FROM PUBLIC; 