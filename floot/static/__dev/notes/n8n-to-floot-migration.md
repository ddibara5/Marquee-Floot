# Marquee ingestion cutover runbook

## Current production architecture — October 2, 2026

Marquee's approved database consolidation is complete; native UI/Auth/manual/history remain authoritative and Trakt writes native-only. Native providers are open; original source writers are held. Release06dfb0dc-d35f-4d65-8ad3-d25268ad4c4b passed actual owner/access/write/Undo, native Trakt57 and October1–2 unattended production cycles. Original services/credentials/releases remain retained.

Detailed current receipts: database-consolidation/production-rollover-handoff-20261001.md and current activation-execution-package-20261001.md/.json; production-execution-evidence-20261001.json. Decision10m29 missed minute10 by29s while maximum15 met. Completed two-check follow-up does not imply permanent monitoring, which is still unassigned. No retirement/revocation/native builds. Full Auth disaster reconstruction and installed-device acceptance remain unproven. Evidence through13:36Z; https://chatgpt.com/space/page_dc47939d2d44819188dae206b4ee668d .

## Historical ingestion cutover record

The dated ingestion-phase constraints and pending statuses below preserve their original evidence. Their retained-Supabase/dual-store/pending-production wording is superseded by the approved database completion above; do not reinterpret old counts or rehearsal results as current live state.

Prepared and cut over 2026-09-30. **Cutover approved and completed; the first published cron cycles remain pending.** The user approved at 14:01 America/New_York. Native Trakt and Crunchyroll source gates are live; both daily schedules were enabled and published at https://marquee-ddibara.floot.app. Only n8n workflows `FcKQLqujv4rBrWCT` and `4ydlrCseHNViR3QM` were deactivated, after draining executions. AniList remains a manual seed with public comparison only. No database/auth migration, Vercel retirement, discovery feature or changes to other apps occurred.

## Completed cutover evidence

The authenticated Floot editor connection was restored at the user's request. Manual validations ran the actual native queued helpers against the retained production databases and connected provider credentials, through the authenticated Floot owner controls. These were editor-triggered live database imports, not claims that a published production cron had already fired. Production publication installed the protected endpoint (anonymous 401) and removed both temporary validation routes (404).

| Source | Final shadow | First live import | Second live import / replay |
| --- | --- | --- | --- |
| Crunchyroll | `6481c191-f60c-40a1-adfd-86d3633ee9ee` | `38e8dc0e-3562-45bf-b921-4bc8a496db12` | `b1d9825e-5241-4687-ab76-70e065284aea` |
| Trakt | `912576c1-6271-42c4-9580-a900e2df8574` | `d6098190-f312-49d3-9baa-f3bc7d663e39` | `954bdb06-d200-4733-9496-f4d6eef14d4e` |

All six runs succeeded. Crunchyroll matched 19 pages / 380 records, 215 mapped, 162 held, 3 partial, and 40 checkpoint overlap; both live runs created zero new raw observations, canonical completions or dates. Trakt matched 3,156 six-feed records; both live remote applies inserted 0, updated 44, skipped 2,501, and held 611 unmapped. Both Floot applies skipped the 2 overlapping history records, inserted/updated 0 history, retained 39 ratings / 13 watchlist entries, and recorded `supabaseCommitted=true,flootCommitted=true`.

Fresh pinned cutover backups:
- Crunchyroll/Floot: `117b1838-c160-4a20-9877-caedbb3e545c`.
- Trakt/Floot: `7564b008-936d-4f71-b760-49a600be87fc`.
- Trakt/Supabase: `a637fbee-108c-4d5e-ae9c-d15e84c2be53`.
- Additional backups were automatically captured immediately before each live run; Supabase first-live backup `de9d1c5f-bea2-43cf-b480-63c9cae8fe50`, replay backup `ad7a2091-b449-4e75-8590-244354b92e4d`. Query by the recorded run IDs to locate paired Floot snapshots.

Final integrity checks:14 Floot and 6 Supabase protected table comparisons passed. Four rating/watchlist comparisons exclude only `updated_at`; their full values, source dates, manual locks and row identities match. The other 16 comparisons match exact sorted JSON. Expected provider-refresh timestamps and Supabase operational sync state advanced; no ratings, watchlist choices, statuses, mappings, manual completion/unwatch intent or dated history changed. Floot retains 2,456 episode events covering 2,374 distinct dated episodes, 1,683 undated completions and 56 title events; latestsourcewatch remains September 30, 03:32:46 UTC. Supabase remains 2,504 dated events (2,501 Trakt + 3 Crunchyroll). No leases, credential blocks, cooldowns or partial commits remain. Owner sync health displays both sources enabled and successful live freshness.

Published build references:
- Initial disabled-schedule publication: `7b0fd6d8-e33e-46f2-8a60-57d137108b75`.
- Crunchyroll schedule publication: `318ed160-afb1-4541-b993-d2b4ea1b75c4`.
- Both schedules publication: `bd0cce81-7484-4dad-a879-bf277555de22`.
- Final restore point: **Marquee native ingestion cutover complete**. Checkpoint restore affects code/config, not database rows or deployments.

Next production firings: October 1 and 2, 09:00 UTC Crunchyroll (5 AM Eastern) and11:17 UTC Trakt (7:17 AM Eastern). Read-only follow-ups are scheduled on both dates at 8 AM Eastern to inspect published cron logs, durable live outcomes, bounded pages, both Trakt commit markers, source maxima/dates, replay safety, manual intent and inactive n8n workflows. These future cycles have not yet been verified; no claim of scheduled-run success is made before evidence exists.

Preparation stayed closed during cutover: previous 13 helper specs, typecheck, desktop/mobile previews and rollback fixtures remain the preparation evidence. Only schedule configuration and documentation changed. New checks were specifically for fresh shadow, live writes, replay, preservation and current gates/workflows. Provider jobs took approximately 21–25 seconds each, around 137 seconds of background provider/runtime waiting in total; this is separate from implementation time. The earlier quota and editor-connection interruptions are resolved.

## Scope and current architecture

| System | Current role | Migration treatment |
| --- | --- | --- |
| Marquee Floot `9ba56374-eb1b-4942-af2f-e15e4df14755` | Existing Floot PostgreSQL and Floot authentication; current UI, manual state, Trakt importer, Crunchyroll processor | Native queued jobs added; preserve existing data/auth |
| Supabase `eiskobjlvxzwvucgpenk` | Legacy Marquee source evidence, canonical history and personal state; shared with GameDeck | Retained; native Trakt reuses existing Marquee RPC; no GameDeck changes |
| n8n Trakt `FcKQLqujv4rBrWCT` | Daily six complete feeds into Supabase `marquee_trakt_apply_snapshot` | Deactivated; native replacement enabled 11:17 UTC daily |
| n8n Crunchyroll `4ydlrCseHNViR3QM` | Daily bounded history posted to production Floot `/_api/crunchyroll-ingest` | Deactivated; native replacement enabled 09:00 UTC daily |
| AniList | Manual-only GitHub Actions workflow in `ddibara5/marquee`; one-time insert-only status/score seed | Public read-only comparison added; no recurring import or schedule |
| Legacy repository/Vercel | Existing endpoints and manual recovery tooling | Retained |

The live architecture differs from an assumption that the Floot UI reads Supabase. It already reads a separate Floot database. This phase preserves both existing stores; it does not reconcile every Supabase-only record into Floot or change authentication. Final consolidation requires a later, separately approved migration.

Inspected Studio standards/registry/development/QA references, GameDeck's migration runbook, Marquee instructions/current files, legacy repository AGENTS/context/runbook/source-of-truth/import documentation, AniList manual workflow, both active workflow definitions and execution evidence. Prior Supermemory decisions were used as leads; live implementation determined current state.

### Callers and source behavior

Trakt n8n fetches history movies/episodes, ratings movies/shows, watchlist movies/shows, paginates complete snapshots, then calls the existing Supabase normalizer with the reviewed approved-show list. The replacement retains that list and RPC. Native Floot Trakt also has owner/manual synchronization and app-visibility refresh; those existing endpoint contracts remain, with a shared import lease. Outbound manual check-ins/ratings/watchlist edits retain existing mechanisms and identities. Staged native imports do not send outbound user edits: pending intent wins, and an unconfirmed personal edit fails the preflight rather than being overwritten.

Crunchyroll n8n actually imports **19 pages / 380 records**, despite a nominal 20-page upper bound in related code. The replacement matches the observed production window. It authenticates/account-checks server-side, follows bounded opaque pagination, validates the selected account digest, then reuses Floot's existing processor. Direct manual Crunchyroll preview/sync and the legacy n8n ingest endpoint retain their contracts and share the new lease.

AniList's public account is Daveywavey9, ID 7375416. The manual seed uses stable media/list-entry IDs, inserts only absent statuses/ratings, and creates no dated history. Absence from n8n therefore did not mean AniList was unused.

## Baseline and source comparison

Counts are independent store observations, not claims of parity between the two databases.

| Measure | Supabase legacy | Floot current |
| --- | ---: | ---: |
| Dated watch history | 2,504: 2,501 Trakt + 3 Crunchyroll | 2,456 episode events: 2,439 Trakt + 17 Crunchyroll; 56 title/movie events |
| Latest Trakt source watch | September 25, 02:23 UTC | September 25 |
| Latest Crunchyroll source watch | September 24, 03:16:26 UTC | September 30, 03:32:46 UTC |
| Crunchyroll retained raw history | 7,938 archived observations | 396 current raw observations |
| Mapping/review backlog | Trakt 611 open; Crunchyroll 2,216 open / 2 dismissed; AniList 45 resolved | Crunchyroll review 158 at initial baseline |
| Seeded personal state | AniList 48 statuses / 33 ratings; Crunchyroll 30 statuses; Trakt 33 ratings | Existing migrated personal state/manual tables retained |

Trakt's complete fresh snapshot contained 3,156 rows:

| Feed | Rows |
| --- | ---: |
| history_movies | 56 |
| history_episodes | 3,048 |
| ratings_movies | 6 |
| ratings_shows | 33 |
| watchlist_movies | 6 |
| watchlist_shows | 7 |

The same Supabase RPC, executed inside a rollback transaction, returned **0 inserted, 44 updated, 2,501 skipped, 611 unmapped** on first apply and replay. “Updated” is the RPC's existing counter; shadow rolled back its changes. Local Floot incremental processing fetched 2 overlapping history records, skipped both, inserted/updated 0, and compared 39 ratings / 13 watchlist items.

Crunchyroll shadow and cached replay both returned **380 fetched, 215 mapped, 162 held, 0 new**, with the existing 40-record checkpoint overlap. Held includes changed-identity observations; partially watched records remain partial. This matches the active workflow's current window. It does not resolve old history or guess mappings.

AniList public comparison returned **50 entries, 50 with mappings, 0 unmapped**, against the retained 48 statuses / 33 ratings; dated watches added: 0.

Recent Floot Crunchyroll evidence retained source IDs/dates:
- `GVWU82NJM`: September 30, 03:32:46 UTC.
- `GX9U3ME58`: September 30, 03:08:27 UTC.
- `G2XUN1GVX`: September 30, 02:34:53 UTC.

## Preserved domain rules

AniList remains authoritative for the initial anime status/score where present. Its seed never overwrites existing status or rating. Crunchyroll supplies fallback verified completion evidence; neither new job writes AniList statuses or ratings. Imported source fields remain distinct from manual intent.

Canonical completion counts use distinct canonical episode IDs across dated events, legacy undated completions and manual completions, with explicit unwatch overrides. The 2,456 dated Floot episode events cover 2,374 distinct episodes; event count is not the progress count. Source evidence is retained rather than deleting overlapping observations.

Manual check-ins, manual ratings, watchlist intent, status choices, locked mappings and explicit overrides remain separate. Automatic In progress/Caught up/Completed derivation is unchanged; manual Paused/Dropped choices are retained. Existing progress/status tests passed and protected-table hashes matched backups.

One Piece and Fairy Tail remain excluded from Crunchyroll by reviewed series IDs and canonical title checks. Mapping remains conservative: existing reviewed identity wins; exact episode title/number matching requires the existing trusted series anchors. Unresolved/changed identities remain held.

Historical Crunchyroll completion remains undated. A first import, a historical observation, an already mapped/repeated record, or changed identity does not create a recent watch date. Promptly observed source-reported dates are limited to 48 hours, retain the provider timestamp, and require existing profile/checkpoint/identity rules. The previous seven-day freshness helper was tightened to 48 hours. Recent held records cannot acquire a date from an old first capture. No import-time “watched today” dates are synthesized. Raw provider timestamps remain evidence rather than blanket proof of viewing date.

No discovery feature was added. Staged Trakt normalization defers external discovery/artwork calls, keeps the enriched catalog/mapping rules, and retains unresolved records for review.

## Implemented native controls

- Secure connected Trakt client resources, encrypted native OAuth rows, existing Crunchyroll server resource, and securely connected PostgreSQL access to the retained Supabase project. No passwords/cookies were requested in chat.
- Named queued page tasks: strict Trakt page/count metadata; Crunchyroll account-scoped cursors and repeated-cursor rejection; capped page/task budgets; staged snapshots retained privately for 14 days.
- Global import lease and shared guards for the existing manual/legacy endpoints. Concurrent start validation returned one accepted run and one `IMPORT_ALREADY_RUNNING`.
- 25-second HTTP timeouts; one bounded transient retry for reads; no blind retry of token exchange, 401/403 credentials or 429 responses. 429 sets a one-hour cooldown. Provider browser challenges are distinct sanitized failures.
- Serialized encrypted Trakt token rotation under a row lock. Missing/rejected credentials block native scheduling until an owner explicitly checks a renewed connection. Crunchyroll cookie expiry requires a secure connection update; there is no claim of a permanent cookie.
- Durable RLS-protected `marquee_import_controls/runs/pages/backups`. Owner-only GET/POST health/control endpoints expose no secrets or staged source payloads.
- Sync page shows freshness, sanitized failures, recent ten runs, source checks, live sync controls when approved, and explicit renewed-connection checks.
- New schedules are **enabled and published**: Trakt `17 11 * * *`, Crunchyroll `0 9 * * *`, both `Etc/UTC`. AniList has no schedule. Existing TMDb schedule is unchanged.
- Live import is gated by source `mode='live'` plus `verified_at`; Trakt/Crunchyroll are live/verified; AniList remains disabled/unverified.

Trakt preflights the real Floot importer in rollback **before** its Supabase commit, including the 500-record normalization cap and pending personal intent. Live Floot apply is transactional. Supabase and Floot cannot commit atomically: before attempting the remote transaction the run durably records `supabaseCommitAttempted=true`; after the remote commit it records `supabaseCommitted=true, flootCommitted=false` before local apply. An ambiguous or confirmed remote commit followed by failure records `PARTIAL_COMMIT_REVIEW_REQUIRED` and disables the source gate. Inspect the remote backup row for this run ID to establish whether that transaction committed. Recovery must be inspected and idempotent; partial work is never reported as full success.

## Rollback references and verification

Workflow exports (credential references only) and original processor files are saved in Marquee:
- `static/__dev/notes/rollback/trakt-active.json`
- `static/__dev/notes/rollback/crunchyroll-active.json`
- `static/__dev/notes/rollback/traktSync.tsx.txt`
- `static/__dev/notes/rollback/traktPersonalSync.tsx.txt`
- `static/__dev/notes/rollback/crunchyrollSync.tsx.txt`

Private pinned pre-migration backup IDs:
- Original Floot baseline: `2ead7382-b239-4358-8762-5c3d3edff414`.
- Original Supabase baseline/RPC definitions: `c1dd6828-89dc-4916-afde-e5fc6fd3ff5d`.
- Complete Floot backup, 30 Marquee tables: `c63afcce-2326-415d-87df-2d2e3bff252e`.
- Complete Supabase backup, 20 Marquee tables: `9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94`.
- Initial code checkpoint: `70bfa8a5-5fe4-4122-afac-a2c767975761`; final prepared code is in the later checkpoint **Marquee ingestion cutover ready for review**.

Per-live backups cover every processor-owned data table. The immutable Floot bootstrap blob is pinned in the complete baseline. Keep the latest 14 successful Floot live backups and seven successful fully committed Trakt Supabase backups; pinned baselines and failed/partial-run backups are never automatically pruned. No auth secrets or unrelated application tables are included.

Preparation validation used real processors and the unchanged Supabase RPC in transactions forced to roll back. Subsequently, the approved live imports and replay committed successfully as recorded above. Existing visibility synchronization updated title maintenance timestamps only. All 21 protected table comparisons matched their baselines: 14 Floot history/manual/mapping/personal tables and seven Supabase history/manual/mapping/sync tables. No fixture rows remain.

Final successful evidence runs:
- Trakt fresh six-feed shadow: `20ea15ff-63cf-4c9e-863a-c0b28c6d5dc9`: 3,156 rows, remote first/replay insert zero; Floot first/replay skip both overlapping records, 39 ratings / 13 watchlist entries.
- Trakt staged replay: `380d4bc5-da22-4be8-b22c-4fb09d6b50a6`; the same staged snapshot and first/replay assertions passed.
- Crunchyroll fresh check after explicit owner renewed-connection recovery: `c474e24c-93c3-49fa-8b77-a2908a979767`: 19 pages, 380 fetched, 215 mapped, 162 held, three partial, zero new raw observations, completions or dated events; checkpoint overlap 40.
- AniList public comparison: `51f6be8a-b926-4696-8345-16fac260bbee`: 50 mapped entries, no dated watches.
- Real-processor rollback fixture audit: `7dccea4f-11ad-43a3-b81e-a0ca7e214952`. Historical completion inserted without a date; replay inserted no duplicate completion; Trakt/manual/Crunchyroll evidence for one canonical episode counted once. One Piece/Fairy Tail excluded; partial history not completed; manual Paused/Dropped, locked AniList rating, manual watchlist and mapping locks preserved. All fixtures rolled back. Audit source is archived at `static/__dev/notes/rollback/marqueeMigrationVerify.tsx.txt`.
- Actual terminal queue callback failure injection: `559219a2-f7c1-4f7b-b4a7-3d8055c66102` recorded `TASK_TERMINAL_FAILURE` and cleared the lease.
- Simulated expired credentials blocked repeated starts without contacting the provider. The owner's **Check renewed connection** button explicitly cleared the block and completed the fresh Crunchyroll check above.

Typecheck is clean. All 13 helper spec files passed, zero failed (three unrelated hook spec files excluded by runner default). Coverage includes bounded retries, credential failures, pagination/cursors, duplicate records, historical dates, mapping conservatism, progress and ratings. Anonymous health requests returned 401; unapproved live actions returned `CUTOVER_NOT_APPROVED`. All temporary validation routes and failure-probe helpers were deleted; the routes return 404.

Signed-in desktop and 393×852 mobile previews were reviewed. Health/history, source checks, credential recovery, disabled live controls and shared-running locks work. Home, Activity, Watch List and title details retain their navigation and source dates; Activity shows the September 29 local viewing dates for September 30 UTC source events. Manual production check-ins were not submitted during QA; preservation was tested through rollback fixtures and baseline hashes.

Final preparation state before approval: both named n8n workflows active, all native source controls disabled/unverified, both new schedules disabled, no active lease, no blocked credential. The completed cutover state above supersedes this historical preparation snapshot. AniList remains a manual seed with public comparison only. Studio's Marquee entry records the retained two-store architecture and pending cutover.

## Remaining limitations

Crunchyroll's 380-record recent window is not a full historical repair. The 162 held current observations and legacy mapping backlogs require reviewed evidence; no mappings were guessed. Supabase and Floot already differ in historical coverage, and this migration preserves both stores. Trakt has no atomic commit across them; source auto-disable and explicit recovery handle that boundary. The native live branch and production deployment are now validated as recorded above; first published scheduled cycles remain pending. Existing secure credentials currently work; expired Crunchyroll cookies require a secure resource update, not chat entry.

## Executed cutover sequence and future recovery reference

The user approved this sequence and it was completed. Retain it as a recovery/reference procedure; approval does not authorize unrelated changes.

1. Approval was obtained to publish Marquee, switch the two source gates/schedules, and deactivate **only** the two named n8n workflows.
2. Publish the approved Marquee checkpoint with both new ingestion schedules still disabled. Confirm owner health and unchanged legacy/manual endpoint contracts in production.
3. Switch one source at a time. Deactivate its exact n8n workflow, preserve its active export/version, and wait for any started execution to finish. The native source gate remains disabled during this pause. Do not run old/new writers concurrently.
4. Take a fresh complete source-scoped backup and record counts/manual state/source watermark. Recheck public-source shadow in production and the owner's credentials. A shadow failure stops the cutover.
5. Set that source's `verified_at` and `mode='live'` only after its successful shadow and n8n quiescence. For example, in a transaction with no active leases:

   ```sql
   UPDATE marquee_import_controls
   SET mode='live', verified_at=now(), credential_blocked=false, retry_after=NULL
   WHERE source='trakt' AND run_id IS NULL;
   ```

   Substitute Crunchyroll only for its own approved switch. Do not enable AniList.
6. Use owner `/_api/ingestion` action `sync` for the first live import; inspect run outcome, both Trakt stores, dates, source evidence, mapping backlog and manual intent. Run a second owner sync to verify replay creates no duplicate canonical completions; account for genuine source activity between snapshots. Any partial Trakt commit requires recovery before continuing.
7. Enable only that source's prepared Floot schedule and publish the schedule change. Trakt: 11:17 UTC daily. Crunchyroll: 09:00 UTC daily. Then repeat steps 3–7 for the other source.
8. Confirm n8n workflows remain inactive, native source controls/schedules are enabled, no other workflows changed, and health reports a successful **live** run rather than a shadow check.

## Rollback and scheduled checks

For an operational rollback, first disable the affected Floot schedule and source gate, publish the disabled schedule if necessary, and wait for queued tasks/in-flight imports to finish or lose their lease. Verify no new writer can start. Reactivate only the original source's n8n workflow after native quiescence. Restore code/checkpoint only if needed; checkpoint restore does not restore database rows or a published deployment.

For data repair, compare the source's pre-run snapshot with canonical keys and source evidence. Reconcile only affected source-owned changes. Preserve newer manual check-ins/ratings/statuses/watchlist/mappings and other apps. **Never wholesale-restore the shared database or overwrite manual state from an old snapshot.** If Supabase committed but Floot did not, inspect the persisted attempt/commit marker and the remote backup row, fix the local error, and rerun the same source idempotently after quiescence; do not invent a cross-database rollback.

Inspect the first two scheduled cycles after cutover:
- Next 09:00 UTC Crunchyroll and 11:17 UTC Trakt firings: correct source/run, bounded page count, successful live finish, no stuck lease or duplicate writer.
- Counts/source maxima match actual provider activity, not ingestion time. Historical Crunchyroll completions remain undated; excluded shows stay excluded.
- Canonical distinct episode counts and retained source evidence agree; manual tables/intent/mapping locks are unchanged except owner actions.
- Credential rejection is visible and blocks repetition; 429 cooldown is honored; provider challenge/partial-window errors are visible.
- Mapping/held backlog is recorded without guessed assignments; Crunchyroll's 380-record recent window is not advertised as full historical coverage.
- Trakt reports both Supabase and Floot committed; partial commit marker or error prevents a success claim.
- Update the runbook and durable decisions with actual production evidence after approval.


## Recorded Floot foundation SQL

This was applied to the existing Floot database. It creates only Marquee operational tables, not catalog/auth migration. Keep credentials and backup payloads server-only.

```sql
create table if not exists marquee_import_controls(
 source text primary key, mode text not null default 'disabled' check(mode in ('disabled','live')),
 verified_at timestamptz, credential_blocked boolean not null default false, retry_after timestamptz,
 run_id uuid, lease_until timestamptz, last_success_at timestamptz);
insert into marquee_import_controls(source) values('trakt'),('crunchyroll'),('anilist') on conflict do nothing;
create table if not exists marquee_import_runs(
 id uuid primary key,source text not null references marquee_import_controls(source), mode text not null check(mode in ('shadow','live')),
 status text not null default 'running',started_at timestamptz not null default now(),finished_at timestamptz,
 counts jsonb not null default '{}',error_code text,reference_run_id uuid, snapshot jsonb not null default '{}');
create table if not exists marquee_import_pages(
 run_id uuid not null references marquee_import_runs(id),feed text not null,page int not null,
 payload jsonb not null,metadata jsonb not null default '{}',primary key(run_id,feed,page));
create table if not exists marquee_import_backups(
 id uuid primary key,created_at timestamptz not null default now(),reason text not null,snapshot jsonb not null);
alter table marquee_import_controls enable row level security;
alter table marquee_import_runs enable row level security;
alter table marquee_import_pages enable row level security;
alter table marquee_import_backups enable row level security;
```

The existing Crunchyroll run-mode constraint was also extended to allow `shadow`. Supabase received only the private `marquee_floot_import_backups` table; public, anon and authenticated grants were revoked. No unrelated app tables/functions were changed.


## Separate database consolidation preparation — September 30, 2026
The ingestion-phase Supabase-retention constraint above still governs live connections. Separately authorized database preparation now exists in static/__dev/notes/database-consolidation.md and database-consolidation.json, with inert scripts/catalogs under database-consolidation/. Private copy/typed-restore/replay gates passed; full-key read-only source delta is zero at the recorded check. Production DB/Auth and schedules are unchanged. October 1–2 unattended checks remain pending and are necessary but insufficient for a database switch. Runtime owner/API/RPC parity, full secure backup, all-writer pause, reverse-delta code and explicit per-app approval remain gates.
