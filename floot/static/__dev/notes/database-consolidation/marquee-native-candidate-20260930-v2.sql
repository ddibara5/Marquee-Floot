
CREATE SCHEMA candidate_marquee_20260930_v2;
REVOKE ALL ON SCHEMA candidate_marquee_20260930_v2 FROM PUBLIC;
CREATE TABLE candidate_marquee_20260930_v2.baseline_manifest(table_name text primary key,rows bigint not null,row_hash text not null,source_backup_id uuid not null);
DO $candidate$
DECLARE m jsonb; t text; colrec record; seq record; fk record; src_count bigint; dst_count bigint; src_hash text; dst_hash text; def text; names text[];
BEGIN
SELECT metadata INTO STRICT m FROM restore_marquee_20260930_caaa07acde67.schema_evidence;
SELECT array_agg(distinct v->>'table_name') INTO names FROM jsonb_array_elements(m->'columns') v;
IF cardinality(names)<>42 THEN RAISE EXCEPTION 'EXPECTED_42_TABLES'; END IF;
FOREACH t IN ARRAY names LOOP
IF NOT (t like 'marquee_%' OR t=ANY(ARRAY['users','sessions','user_passwords','login_attempts'])) THEN RAISE EXCEPTION 'UNEXPECTED_TABLE'; END IF;
EXECUTE format('CREATE TABLE candidate_marquee_20260930_v2.%I (LIKE public.%I INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING IDENTITY INCLUDING STORAGE)',t,t);
EXECUTE format('INSERT INTO candidate_marquee_20260930_v2.%I OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::candidate_marquee_20260930_v2.%I,to_jsonb(x))).* FROM restore_marquee_20260930_caaa07acde67.%I x',t,t,t);
EXECUTE format('SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text) COLLATE "C"),'''')) FROM restore_marquee_20260930_caaa07acde67.%I x',t) INTO src_count,src_hash;
EXECUTE format('SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text) COLLATE "C"),'''')) FROM candidate_marquee_20260930_v2.%I x',t) INTO dst_count,dst_hash;
IF src_count<>dst_count OR src_hash<>dst_hash THEN RAISE EXCEPTION 'CANDIDATE_COPY_HASH:%',t; END IF;
INSERT INTO candidate_marquee_20260930_v2.baseline_manifest VALUES(t,dst_count,dst_hash,'caaa07ac-de67-4ea2-9bb1-599279f705f7');
END LOOP;
FOR seq IN SELECT value FROM jsonb_array_elements(m->'sequences') LOOP
t=seq.value->>'sequencename';
IF to_regclass('candidate_marquee_20260930_v2.'||quote_ident(t)) IS NULL THEN
EXECUTE format('CREATE SEQUENCE candidate_marquee_20260930_v2.%I AS %s INCREMENT BY %s MINVALUE %s MAXVALUE %s START WITH %s %s',t,seq.value->>'data_type',seq.value->>'increment_by',seq.value->>'min_value',seq.value->>'max_value',seq.value->>'start_value',CASE WHEN (seq.value->>'cycle')::boolean THEN 'CYCLE' ELSE 'NO CYCLE' END);
END IF;
IF seq.value->>'last_value' IS NOT NULL THEN PERFORM setval(('candidate_marquee_20260930_v2.'||quote_ident(t))::regclass,(seq.value->>'last_value')::bigint,true); END IF;
END LOOP;
FOR colrec IN SELECT value FROM jsonb_array_elements(m->'columns') WHERE value->>'default_expression' IS NOT NULL LOOP
-- Resolve unqualified sequence defaults against the private candidate, not public.
PERFORM set_config('search_path','candidate_marquee_20260930_v2,pg_catalog',true);
def=replace(colrec.value->>'default_expression','public.','candidate_marquee_20260930_v2.');
EXECUTE format('ALTER TABLE candidate_marquee_20260930_v2.%I ALTER COLUMN %I SET DEFAULT %s',colrec.value->>'table_name',colrec.value->>'name',def);
END LOOP;
FOR fk IN SELECT c.conname,c.conrelid::regclass::text source_table,cl.relname table_name,ref.relname target_table,pg_get_constraintdef(c.oid) definition
FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_class ref ON ref.oid=c.confrelid
WHERE c.contype='f' AND cl.relnamespace='public'::regnamespace AND cl.relname=ANY(names) LOOP
IF fk.target_table<>ALL(names) THEN RAISE EXCEPTION 'FOREIGN_KEY_TARGET_REVIEW:%',fk.target_table; END IF;
def=regexp_replace(fk.definition,'REFERENCES (public\.)?'||quote_ident(fk.target_table)||'\(','REFERENCES candidate_marquee_20260930_v2.'||quote_ident(fk.target_table)||'(');
def=regexp_replace(def,' DEFERRABLE( INITIALLY (DEFERRED|IMMEDIATE))?','');
def=regexp_replace(def,' NOT DEFERRABLE','');
EXECUTE format('ALTER TABLE candidate_marquee_20260930_v2.%I ADD CONSTRAINT %I %s DEFERRABLE INITIALLY IMMEDIATE',fk.table_name,fk.conname,def);
END LOOP;
END $candidate$;
REVOKE ALL ON ALL TABLES IN SCHEMA candidate_marquee_20260930_v2 FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA candidate_marquee_20260930_v2 FROM PUBLIC;
