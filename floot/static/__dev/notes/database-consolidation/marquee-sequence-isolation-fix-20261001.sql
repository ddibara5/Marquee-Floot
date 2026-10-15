-- Correct only private candidate sequence defaults; never reset public sequences.
DO $isolation$
DECLARE r record; private_sequence regclass; current_value bigint; max_key bigint; corrected integer=0;
BEGIN
FOR r IN
 SELECT c.relname table_name,a.attname column_name,s.relname sequence_name
 FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid=ad.adrelid AND a.attnum=ad.adnum
 JOIN pg_class c ON c.oid=ad.adrelid
 JOIN pg_depend d ON d.classid='pg_attrdef'::regclass AND d.objid=ad.oid
 JOIN pg_class s ON s.oid=d.refobjid AND s.relkind='S'
 WHERE c.relnamespace='candidate_marquee_20260930_v2'::regnamespace
LOOP
 private_sequence=to_regclass(format('candidate_marquee_20260930_v2.%I',r.sequence_name));
 IF private_sequence IS NULL THEN RAISE EXCEPTION 'PRIVATE_SEQUENCE_MISSING'; END IF;
 EXECUTE format('ALTER TABLE candidate_marquee_20260930_v2.%I ALTER COLUMN %I SET DEFAULT nextval(%L::regclass)',r.table_name,r.column_name,private_sequence::text);
 EXECUTE format('ALTER SEQUENCE %s OWNED BY candidate_marquee_20260930_v2.%I.%I',private_sequence,r.table_name,r.column_name);
 EXECUTE format('SELECT last_value FROM %s',private_sequence) INTO current_value;
 EXECUTE format('SELECT max(%I) FROM candidate_marquee_20260930_v2.%I',r.column_name,r.table_name) INTO max_key;
 PERFORM setval(private_sequence,greatest(current_value,coalesce(max_key,current_value)),true);
 corrected=corrected+1;
END LOOP;
IF corrected<>14 THEN RAISE EXCEPTION 'EXPECTED_14_SEQUENCE_DEFAULTS'; END IF;
IF EXISTS(
 SELECT 1 FROM pg_attrdef ad JOIN pg_class c ON c.oid=ad.adrelid
 JOIN pg_depend d ON d.classid='pg_attrdef'::regclass AND d.objid=ad.oid
 JOIN pg_class s ON s.oid=d.refobjid AND s.relkind='S'
 WHERE c.relnamespace='candidate_marquee_20260930_v2'::regnamespace
 AND s.relnamespace<>'candidate_marquee_20260930_v2'::regnamespace
) THEN RAISE EXCEPTION 'EXTERNAL_SEQUENCE_DEPENDENCY'; END IF;
END $isolation$;
