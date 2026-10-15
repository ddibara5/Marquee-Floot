# Quiet health (audit Batch 3) - October 12, 2026

Status: preview only, not published.

## Backup retention
Cause (confirmed from source and the barrier function): `finishImport` releases the run's writer lease, then `pruneMarqueeBackups` ran under that same lease, so `barrier_marquee_20260930_v2.admit` raised `MIGRATION_LEASE_LOST`; the bare catch logged `BACKUP_RETENTION_FAILED` on every live run since Oct 2 and nothing was deleted.
Fix: native Trakt and Crunchyroll finishers call new `retainBackups` before `finishImport`, while the lease is held. `retainBackups` never fails a run and now logs the reason. Retention rule unchanged: keep the latest 14 succeeded live backups plus all non pre-live (pinned migration) snapshots. The inactive dual-store Trakt branch is untouched.
Dry run Oct 12 (read-only): first run deletes 14 pre-live backups from Sept 30 to Oct 5; 14 newest live backups and 4 pinned snapshots stay. The in-flight run's own backup is kept, so 15 pre-live rows remain after each run.

## Health alarm
No code change. The 5 "awaiting review" items are My Hero Academia specials; they are listed in Settings > Data & sync > Mapping review with an Ignore button, and `monitorSyncHealth` already skips ignored items. The Trakt pending items clear through Batch 1.

## Validation
Typecheck clean; 29 non-hook specs pass. No UI change.
