-- INERT: execute only with separately approved Marquee rollback/binding package.
-- Resource: original PostgreSQL Database, project eiskobjlvxzwvucgpenk.
-- Requires install-legacy-live-bindings-20261001.sql first, frozen/drained stores and fresh restored backup.
-- Does not install public triggers, invoke the normalizer, modify Auth, or resume writers.
BEGIN;
DO $guard$
BEGIN
 IF current_setting('migration.approved_package',true) IS DISTINCT FROM 'marquee:rollback:20261001' THEN RAISE EXCEPTION 'SEPARATE_ROLLBACK_APPROVAL_REQUIRED'; END IF;
 IF coalesce(current_setting('migration.final_backup_receipt',true),'')='' THEN RAISE EXCEPTION 'FRESH_RESTORED_BACKUP_REQUIRED'; END IF;
 PERFORM 1 FROM barrier_marquee_legacy_live_20261001.control WHERE id AND mode='paused' AND clock_timestamp()<abort_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_FROZEN_WINDOW_REQUIRED'; END IF;
 PERFORM barrier_marquee_legacy_live_20261001.verify_binding();
END $guard$;
CREATE TABLE IF NOT EXISTS barrier_marquee_legacy_live_20261001.remote_receipts(
 run_id uuid PRIMARY KEY,snapshot_sha256 text NOT NULL CHECK(length(snapshot_sha256)=64),
 result jsonb NOT NULL,committed_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON barrier_marquee_legacy_live_20261001.remote_receipts FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
-- Verify the receipt table's exact columns/constraints during installation; IF NOT EXISTS does not prove its shape.
