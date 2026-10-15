
-- Isolated transfer proves migration rollback preserves AFTER values, not undo values.
DO $verify$
DECLARE lower_id bigint; payload jsonb; result jsonb; before_value jsonb; after_value jsonb; rejected boolean; changed_count bigint;
BEGIN
BEGIN
CREATE TABLE {{V}}.transfer_source(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,n numeric(30,12),event_date date,manual text,token text);
CREATE TABLE {{P}}.transfer_target(LIKE {{V}}.transfer_source INCLUDING ALL);
INSERT INTO {{V}}.transfer_source OVERRIDING SYSTEM VALUE VALUES(9007199254740993,123456789012345678.123456789012,'1999-08-01','paused','fixture-old'),(2,4,NULL,'undated',NULL),(3,7,'1999-08-03','unwatch',NULL);
INSERT INTO {{P}}.transfer_target OVERRIDING SYSTEM VALUE SELECT * FROM {{V}}.transfer_source;
PERFORM {{V}}.register('{{V}}.transfer_source','transfer');
PERFORM {{P}}.register('{{P}}.transfer_target','transfer');
SELECT coalesce(max(id),0) INTO lower_id FROM {{V}}.journal;
UPDATE {{V}}.transfer_source SET manual='new-manual-completed',token='fixture-rotated-preserve',n=123456789012345678.123456789013 WHERE id=9007199254740993;
DELETE FROM {{V}}.transfer_source WHERE id=2;
INSERT INTO {{V}}.transfer_source OVERRIDING SYSTEM VALUE VALUES(4,8,NULL,'new-unwatch-tombstone',NULL);
DELETE FROM {{V}}.transfer_source WHERE id=3;
INSERT INTO {{V}}.transfer_source OVERRIDING SYSTEM VALUE VALUES(5,7,'1999-08-03','unwatch',NULL);
PERFORM {{V}}.pause();PERFORM {{V}}.drained(0,0,true);
PERFORM {{P}}.pause();PERFORM {{P}}.drained(0,0,true);
result={{V}}.seal_rollback_transfer('preserve-after-20261001',lower_id);
IF (result->>'undo')::boolean OR result->>'purpose'<>'native-to-retained-preserve-new-changes' THEN RAISE EXCEPTION 'ROLLBACK_DIRECTION_WRONG'; END IF;
SELECT sb.payload INTO payload FROM {{V}}.sealed_batches sb WHERE batch_id='preserve-after-20261001';
IF {{P}}.apply('preserve-after-20261001',payload)<>5 THEN RAISE EXCEPTION 'TRANSFER_CHANGE_COUNT'; END IF;
IF EXISTS((SELECT * FROM {{V}}.transfer_source EXCEPT SELECT * FROM {{P}}.transfer_target) UNION ALL (SELECT * FROM {{P}}.transfer_target EXCEPT SELECT * FROM {{V}}.transfer_source)) THEN RAISE EXCEPTION 'RETAINED_AFTER_VALUES_LOST'; END IF;
IF NOT EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id=9007199254740993 AND token='fixture-rotated-preserve' AND manual='new-manual-completed' AND n=123456789012345678.123456789013 AND event_date='1999-08-01') OR EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id IN(2,3)) OR NOT EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id=4 AND event_date IS NULL AND manual='new-unwatch-tombstone') THEN RAISE EXCEPTION 'PROTECTED_AFTER_STATE_LOST'; END IF;
IF {{P}}.apply('preserve-after-20261001',payload)<>0 THEN RAISE EXCEPTION 'TRANSFER_REPLAY_WRITES'; END IF;
SELECT to_jsonb(t) INTO before_value FROM {{P}}.transfer_target t WHERE id=5;
after_value=before_value||jsonb_build_object('id',6);
changed_count={{P}}.apply('identity-pk-move',jsonb_build_array(jsonb_build_object('table','transfer','before',before_value,'after',after_value)));
IF changed_count<>1 OR EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id=5) OR NOT EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id=6) THEN RAISE EXCEPTION 'ALWAYS_IDENTITY_MOVE_LOST'; END IF;
CREATE TABLE {{V}}.bad_source(id bigint,n numeric(30,12),event_date date,manual text,token text);
INSERT INTO {{V}}.bad_source SELECT * FROM {{P}}.transfer_target;
INSERT INTO {{V}}.bad_source SELECT * FROM {{P}}.transfer_target LIMIT 1;
rejected=false;
BEGIN PERFORM {{P}}.full_key_delta('{{V}}.bad_source','{{P}}.transfer_target','transfer');EXCEPTION WHEN OTHERS THEN IF SQLERRM='SOURCE_KEY_COVERAGE_INVALID' THEN rejected=true;ELSE RAISE;END IF;END;
IF NOT rejected THEN RAISE EXCEPTION 'DUPLICATE_KEYS_ADMITTED'; END IF;
DELETE FROM {{V}}.bad_source;
INSERT INTO {{V}}.bad_source VALUES(NULL,1,NULL,NULL,NULL);
rejected=false;
BEGIN PERFORM {{P}}.full_key_delta('{{V}}.bad_source','{{P}}.transfer_target','transfer');EXCEPTION WHEN OTHERS THEN IF SQLERRM='SOURCE_KEY_COVERAGE_INVALID' THEN rejected=true;ELSE RAISE;END IF;END;
IF NOT rejected THEN RAISE EXCEPTION 'NULL_KEY_ADMITTED'; END IF;
rejected=false;
BEGIN PERFORM {{P}}.apply('bad-postimage','[{"table":"transfer","before":null,"after":{"id":999,"n":1,"event_date":null,"manual":null,"token":null,"unexpected":"must-not-disappear"}}]'::jsonb);EXCEPTION WHEN OTHERS THEN IF SQLERRM='DELTA_POSTIMAGE_CONFLICT:transfer' THEN rejected=true;ELSE RAISE;END IF;END;
IF NOT rejected OR EXISTS(SELECT 1 FROM {{P}}.transfer_target WHERE id=999) THEN RAISE EXCEPTION 'POSTIMAGE_ATOMICITY_FAILED'; END IF;
RAISE EXCEPTION 'ISOLATED_TRANSFER_ROLLBACK';
EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'ISOLATED_TRANSFER_ROLLBACK' THEN RAISE;END IF;
END;
INSERT INTO {{V}}.test_results VALUES
('sealed transfer preserves post-switch manual token date delete tombstone',true),
('sealed transfer exact bigint numeric row parity',true),
('sealed transfer replay zero writes',true),
('generated-always identity key move preserved',true),
('full-key source duplicate keys rejected',true),
('full-key source null keys rejected',true),
('postimage failure atomically rolls back',true);
END $verify$;
