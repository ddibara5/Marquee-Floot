-- INERT. Install only in a reviewed per-app window. Schema must be private and app-scoped.
CREATE SCHEMA {{RECEIPT_SCHEMA}};
REVOKE ALL ON SCHEMA {{RECEIPT_SCHEMA}} FROM PUBLIC;
CREATE TABLE {{RECEIPT_SCHEMA}}.remote_receipts(run_id uuid PRIMARY KEY,snapshot_sha256 text NOT NULL CHECK(length(snapshot_sha256)=64),result jsonb NOT NULL,committed_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON ALL TABLES IN SCHEMA {{RECEIPT_SCHEMA}} FROM PUBLIC;
-- Receipt and normalizer effects commit together. Native marker follows; retry uses exact digest.
