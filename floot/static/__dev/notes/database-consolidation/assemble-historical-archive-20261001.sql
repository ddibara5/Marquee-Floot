
-- Reviewed UTC October 1 isolated assembly, historical evidence only. Never a runtime target.
CREATE SCHEMA archive_marquee_20261001;
REVOKE ALL ON SCHEMA archive_marquee_20261001 FROM PUBLIC;
CREATE TABLE archive_marquee_20261001.parts(receipt_id uuid PRIMARY KEY,section text NOT NULL,offset_n integer,header jsonb NOT NULL,snapshot jsonb NOT NULL);
CREATE TABLE archive_marquee_20261001.historical_backups(id uuid PRIMARY KEY,created_at timestamptz NOT NULL,run_id uuid,snapshot jsonb NOT NULL);
CREATE TABLE archive_marquee_20261001.evidence(test text PRIMARY KEY,passed boolean NOT NULL,detail jsonb NOT NULL);
DO $assembly$
DECLARE r record; fq text; n bigint; h text; combined jsonb; header_value jsonb; raw_value jsonb; snapshot_value jsonb;
expected_sections text[]=ARRAY['marquee_episodes','marquee_franchise_overrides','marquee_ingest_raw','marquee_mapping_review','marquee_movies','marquee_ratings','marquee_season_release_schedules','marquee_seasons','marquee_shows','marquee_source_mappings','marquee_statuses','marquee_sync_state','marquee_titles','marquee_undated_completion_evidence','marquee_undated_completions','marquee_verified_season_totals','marquee_watch_date_decisions','marquee_watch_history','marquee_watch_history_sources','marquee_watchlist'];
BEGIN
SELECT count(*) INTO n FROM migration_backups_20260930.receipts WHERE archive_id='9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94' AND app='marquee' AND source='legacy' AND restored_tables=1;
IF n<>131 THEN RAISE EXCEPTION 'ALL_131_EXACT_RESTORES_REQUIRED'; END IF;
FOR r IN SELECT * FROM migration_backups_20260930.receipts WHERE archive_id='9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94' ORDER BY archive_section,archive_offset LOOP
IF r.archive_section<>ALL(expected_sections) OR r.restored_tables<>1 OR r.app<>'marquee' OR r.source<>'legacy' THEN RAISE EXCEPTION 'PART_DISPOSITION_REVIEW'; END IF;
fq=format('%I.marquee_floot_import_backups','restore_marquee_20260930_'||left(replace(r.id::text,'-',''),12));
EXECUTE format('SELECT count(*) FROM %s',fq) INTO n;
IF n<>1 THEN RAISE EXCEPTION 'RESTORED_PART_ROW_COVERAGE'; END IF;
EXECUTE format('INSERT INTO archive_marquee_20261001.parts SELECT $1,$2,$3,to_jsonb(t)-''snapshot'',snapshot FROM %s t',fq) USING r.id,r.archive_section,r.archive_offset;
END LOOP;
IF EXISTS(SELECT 1 FROM archive_marquee_20261001.parts GROUP BY section,offset_n HAVING count(*)<>1) THEN RAISE EXCEPTION 'DUPLICATE_PART'; END IF;
IF EXISTS(SELECT 1 FROM archive_marquee_20261001.parts p WHERE jsonb_typeof(snapshot)<>'object' OR NOT snapshot ? section OR (SELECT count(*) FROM jsonb_object_keys(snapshot))<>1 OR jsonb_typeof(snapshot->section)<>'array') THEN RAISE EXCEPTION 'PART_SECTION_SHAPE'; END IF;
IF (SELECT count(DISTINCT header) FROM archive_marquee_20261001.parts)<>1 THEN RAISE EXCEPTION 'HEADER_DRIFT'; END IF;
SELECT header INTO header_value FROM archive_marquee_20261001.parts LIMIT 1;
IF header_value->>'id'<>'9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94' THEN RAISE EXCEPTION 'ARCHIVE_ID_MISMATCH'; END IF;
IF EXISTS(SELECT generate_series(0,11100,100) EXCEPT SELECT offset_n FROM archive_marquee_20261001.parts WHERE section='marquee_ingest_raw') OR
EXISTS(SELECT offset_n FROM archive_marquee_20261001.parts WHERE section='marquee_ingest_raw' EXCEPT SELECT generate_series(0,11100,100)) THEN RAISE EXCEPTION 'COMPLETE_OFFSET_SET_REQUIRED'; END IF;
IF EXISTS(SELECT 1 FROM archive_marquee_20261001.parts WHERE section='marquee_ingest_raw' AND (offset_n IS NULL OR jsonb_array_length(snapshot->section)<>CASE WHEN offset_n=11100 THEN 46 ELSE 100 END)) THEN RAISE EXCEPTION 'RAW_SLICE_LENGTH'; END IF;
IF (SELECT count(*) FROM archive_marquee_20261001.parts WHERE section<>'marquee_ingest_raw' AND offset_n IS NULL)<>19 OR
EXISTS(SELECT 1 FROM archive_marquee_20261001.parts WHERE section<>'marquee_ingest_raw' AND offset_n IS NOT NULL) THEN RAISE EXCEPTION 'OTHER_SECTION_COVERAGE'; END IF;
IF EXISTS(SELECT unnest(expected_sections) EXCEPT SELECT DISTINCT section FROM archive_marquee_20261001.parts) THEN RAISE EXCEPTION 'SECTION_KEY_SET'; END IF;
SELECT jsonb_agg(v.value ORDER BY p.offset_n,v.ordinality) INTO raw_value FROM archive_marquee_20261001.parts p CROSS JOIN LATERAL jsonb_array_elements(p.snapshot->p.section) WITH ORDINALITY v(value,ordinality) WHERE p.section='marquee_ingest_raw';
IF jsonb_array_length(raw_value)<>11146 THEN RAISE EXCEPTION 'RAW_ROW_COVERAGE'; END IF;
SELECT jsonb_object_agg(section,snapshot->section) INTO snapshot_value FROM archive_marquee_20261001.parts WHERE section<>'marquee_ingest_raw';
combined=header_value||jsonb_build_object('snapshot',snapshot_value||jsonb_build_object('marquee_ingest_raw',raw_value));
INSERT INTO archive_marquee_20261001.historical_backups SELECT (jsonb_populate_record(NULL::archive_marquee_20261001.historical_backups,combined)).*;
SELECT md5(to_jsonb(t)::text) INTO h FROM archive_marquee_20261001.historical_backups t;
IF h<>'93751823f4eaab467f7d123ace5ee49b' THEN RAISE EXCEPTION 'FULL_ROW_HASH_MISMATCH'; END IF;
UPDATE migration_backups_20260930.receipts receipt_row SET archive_slice_rows=jsonb_array_length(p.snapshot->p.section) FROM archive_marquee_20261001.parts p WHERE p.receipt_id=receipt_row.id AND p.section='marquee_ingest_raw';
INSERT INTO archive_marquee_20261001.evidence VALUES
('complete-131-part-key-set',true,jsonb_build_object('parts',131,'rawSlices',112,'otherSections',19)),
('raw-order-length-final-slice',true,jsonb_build_object('rawRows',11146,'lastSlice',46)),
('identical-original-full-row',true,jsonb_build_object('hash',h,'atomicAcrossParts',false));
FOR r IN SELECT * FROM (VALUES
('6b70c08d-1a6b-41aa-8ba3-777fd829b419'::uuid,'4079ce02fc82434cf14db7833ef253fd'),
('b65e3609-13b3-46ea-95a9-d642786ccff7'::uuid,'062d9bc2fb5e276289d0a444dcf466fc'),
('eeb6aaa2-46a8-4ece-adf0-9b1a1b7e33d2'::uuid,'2a8dfde83ed3f702368fb436b24a48f1'),
('73a624ef-b3f3-4de3-bbb4-68dcd99cb2ad'::uuid,'a406099e7fbad13916802ef0ed7e7746')) x(id,expected_hash) LOOP
IF NOT EXISTS(SELECT 1 FROM migration_backups_20260930.receipts WHERE id=r.id AND restored_tables=1 AND app='marquee' AND source='legacy') THEN RAISE EXCEPTION 'WHOLE_RESTORE_REQUIRED'; END IF;
fq=format('%I.marquee_floot_import_backups','restore_marquee_20260930_'||left(replace(r.id::text,'-',''),12));
EXECUTE format('SELECT count(*),min(md5(to_jsonb(t)::text)) FROM %s t',fq) INTO n,h;
IF n<>1 OR h<>r.expected_hash THEN RAISE EXCEPTION 'WHOLE_ARCHIVE_HASH_MISMATCH'; END IF;
EXECUTE format('INSERT INTO archive_marquee_20261001.historical_backups SELECT * FROM %s',fq);
END LOOP;
INSERT INTO archive_marquee_20261001.evidence VALUES('five-original-historical-rows-restored',true,jsonb_build_object('rows',5));
END $assembly$;
REVOKE ALL ON ALL TABLES IN SCHEMA archive_marquee_20261001 FROM PUBLIC;
