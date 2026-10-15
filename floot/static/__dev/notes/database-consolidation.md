# Marquee database consolidation

## Storage cleanup — October 12, 2026

Dave approved (Oct 12, 1:39 PM ET, option "Scratch + rollback copies") dropping the migration rehearsal and rollback schemas. At about 17:47 UTC, 165 schemas were dropped in one transaction: 148 `restore_marquee_20260930_*` scratch restores plus prep, candidate, exercise, verify, transfer, recovery, retained and the runner/recovery/bridge barriers. The pgcrypto extension lived in `prep_marquee_20260930` and went with it (no kept object or live code used it; it can be re-created). Database size 912 MB to 239 MB.

Kept: `public`, the live writer barrier `barrier_marquee_20260930_v2` (gate and journal triggers on every public table, used by marqueeWriter), `archive_marquee_20261001` (131 archive parts, historical backups, evidence; plain jsonb) and `migration_backups_20260930` (receipts and hashes). Before dropping, pg_depend showed no kept object depending on a dropped one, and no live helper or scheduled job referenced the dropped schemas.

Consequence: the October 1 migration's rollback and recovery path (retained store rollback, remote and cross-resource recovery, runtime backup and exercise endpoints) no longer works; those `migration-*` endpoints will fail if called. The superseded statements below about retained rollback copies describe the state before this cleanup. Original external services and credentials were not touched.

## Current production status — October 2, 2026

Marquee is accepted on native production at https://marquee-ddibara.floot.app, release checkpoint 06dfb0dc-d35f-4d65-8ad3-d25268ad4c4b / publication 78d518e6-80b9-40fc-90e1-3f619cfcf472. Native UI/Auth/manual/history and native-only Trakt routing are published. Exact native 42/source 21 bindings, actual drain, fresh frozen backups and exact restores, three approved bridge additions/replay 0, owner/anonymous/write/Undo and first native Trakt run 57 passed. October 1–2 unattended source cycles are verified in the living plan. Native providers remain open; retained source writers remain paused. The final recorded checks were native control/work at 2026-10-02T13:16:11Z and source gate/21 bindings at 13:33:48Z. No new Marquee publication was needed for the GameDeck completion.

Marquee's explicit resume decision occurred at 10m29s: the minute-10 requirement was missed by 29 seconds; the maximum 15-minute pause was met. This deviation is preserved without backdating. MQ13, all 131 archive parts, six full historical rows, frozen backups and private delta evidence remain preserved. Original services/credentials/releases are retained; no retirement, revocation or native/EAS build occurred. Full production/Auth disaster reconstruction and installed-device acceptance remain unproven. Permanent Marquee monitoring remains unassigned after the completed two-check follow-up; no new schedule is implied.

Current technical sources: static/__dev/notes/database-consolidation/production-rollover-handoff-20261001.md, activation-execution-package-20261001.md/.json and production-execution-evidence-20261001.json. Evidence through 2026-10-02T13:36Z; publication status was reread during this documentation reconciliation. Living plan: https://chatgpt.com/space/page_dc47939d2d44819188dae206b4ee668d .

## Historical preparation and approval records

The dated records below preserve preparation state at their recorded time. Their pending-auth, disabled-binding and production-hold claims are superseded by the current completion above; immutable receipts and failures are preserved.

## Approved production rollover — 2026-10-01T23:38:14Z

Production execution/publication/live bindings/cutover under the prepared per-app plan are now explicitly approved by Dave, Marquee first then independently ready GameDeck. Read database-consolidation/production-rollover-handoff-20261001.md and production-authorization-20261001.json (in this directory for package files). No production pause or activation has started. Earlier dated pending/unauthorized statements are superseded for this migration only; actual frozen backup/drain/binding/delta/release/Auth gates remain. Retirement, revocation and native/EAS builds remain excluded. Do not ask for the same approval again.


## Latest preparation — 2026-10-01T23:12Z

Fresh protected pre-install backups and exact isolated typed restores passed. The new private delta/replay/reverse rehearsal passed; production remains unchanged and final frozen-window gates remain open. Read database-consolidation/fresh-preinstall-and-delta-evidence-20261001.json, current activation-execution-package-20261001.md/.json and codex-handoff-20261001.md before the dated records below. Original completed GD22/MQ13 evidence remains preserved. Scope clarification is pending because the original user instruction prohibited production activation.

 
## Current resumable checkpoint

Updated 2026-10-01T20:56:48.510Z. Read database-consolidation/retained-runner-checkpoint-20261001.md/.json and activation-review-20261001.md/.json; codex-handoff-20261001.md is the new-chat continuity note.

Marquee's concrete retained-store factory and capability-protected operator endpoint are implemented. The same shared runner passed **13 actual separate-resource private checks**, receipt `0fce3393-6082-421f-a235-9b40907a45f6`: all-run preflight, chronological source recovery with the actual private SQL normalizer, real native acknowledgement transaction failure after remote commit, durable retry repair, zero-change replay, exact dates, retained Auth/manual values and restored gate/journal state. No provider transport occurred. Four focused spec files passed; full typecheck clean. The endpoint returned401 without authorization and503 while its package authorization is unset; production factory was not invoked. Complete runner proof is private, not full production rollback proof.

Production is unchanged by migration preparation. No publish, cutover, live/public migration binding installation, service retirement or credential revocation is authorized. Preparation backups/restores, archives and completed audits remain preserved. Fresh final-window backups/restores and full production rollback are not proven.

The following September30 reconciliation record is historical evidence. Its older unresolved auth/runtime/schedule statements are superseded by the current activation package. GameDeck secure native enrollment is selected and disabled; Marquee retains native Auth. October1 operational/current-data checks passed; October2 is monitoring, not a required date hold.

## Destination and baselines

Keep Marquee independent of GameDeck. Rehearsal schema prep_marquee_20260930 is private, with b_* exact source JSON, t_* typed restorations and n_* current-native copies. A private pgcrypto extension supports bulk evidence compression transport; it is not a credential-security mechanism. Public app tables and current user 1/password/session data were not changed. Generated database helpers typecheck cleanly.

Twenty-one legacy tables passed source/backup/typed count/hash equality, zero-row replay, incomplete-copy recovery and available FK orphan checks (zero). Legacy auth.users references are intentionally retained UUID evidence rather than cloned identities. PUBLIC table grants: zero. Legacy manifest SHA256 d6d60679b1511dcebdc8c1fb2939cca3948e308e5b7e5f5fbdc6e6b0e7097340. Thirty-four current-native tables passed live/copy equality again at 20:39 UTC; native manifest SHA256 ec807a46a0e5c19455b5910916cf0b97d0ecb5aafd9dc3be4648f7bcb7eaa44f. These are non-atomic preparation snapshots, not complete auth/token backups.

| Data | Legacy Supabase | Current Floot |
| --- | ---: | ---: |
| Titles / seasons / episodes | 273 / 367 / 4026 | 274 / 378 / 4165 |
| Dated history rows / source records | 2504 / 2504 | 2456 episode events + 56 title events |
| Undated completions | 1667 | 1683 |
| Ratings / statuses / watchlist seed | 66 / 78 / 13 | 65 / 78 / 13 legacy seed |
| Current Trakt ratings / watchlist | Separate provider evidence | 40 / 16 |
| Manual completions / unwatch / removed outbox | Native-only state | 66 / 1 / 5 |
| Source mappings | 4640 | 4646 |
| Raw ingest / completion evidence | 11146 / 3995 | Retain private source archive |
| Mapping review / date decisions / verified totals | 2874 / 3 / 80 | Retain evidence and current decisions |
| Native legacy-import / links | Not equivalent tables | 13630 / 4657 |

Other source tables: franchise_overrides 0, release_schedule 1, sync_runs 37, sync_state 3. Raw evidence is 50 AniList, 7938 Crunchyroll and 3158 Trakt. An interrupted parallel transfer initially left 50 holes below the maximum key; full key-set reconciliation repaired all 50. All 11146 now pass count/hash (39392fb1f961d91b81505cb9c065fcff) and typed restore. Complete key-set reconciliation is mandatory after any interrupted transfer.

Catalog metadata: 199 columns, 133 constraints, 31 policies, 76 indexes, 362 grants, 2 triggers, 2 views, 9 functions. SHA256 1aedb3f0b2315869e2c84a60a4c94100c94c5d92b54daba4027ba7b28e72f584. Auth/password/session/OAuth/device-auth and operational payload-backup material is excluded from static export. Existing complete pre-ingestion backups c63afcce-2326-415d-87df-2d2e3bff252e (native) and 9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94 (remote) remain; they are not a fresh full authentication backup.

## Reconciliation decisions and evidence

- 2498 of 2504 source history keys reconcile to current native targets and exact watched timestamps after an explicit private Last Seen episode bridge. Six remaining events belong to One Piece live-action (2023), legacy show 184618 / TMDB 111110: retain archival evidence only under the existing One Piece/Fairy Tail exclusions. Result: 2498 matched, 6 excluded-archive-only, 0 missing, 0 conflicting event targets/dates. No live watch event was inserted.
- Last Seen crosswalk is legacy episode UUID 8d0d1efa-b0d5-4614-aca7-9c7225cf3676 → native episode 287. Evidence: already mapped season 26, season 1 episode 4, Trakt 14210359 and TMDB 7321036. Do not infer it by name. Candidate stays private until reviewed promotion.
- Fourteen current-native-only dated events remain; do not replace native history wholesale. All 1667 source undated completions are represented; 16 newer/native additional undated completions remain. Never set their watched_at to import time or today's date.
- Ten source mapping IDs lack native legacy links: nine excluded One Piece rows and the explicit Last Seen bridge. All 4640 rows are retained in the source archive. Numeric/field-name normalization eliminates apparent rating/mapping differences; no unresolved represented manual-lock or seed-value conflicts remain.
- Source rating 66 is not lost: Trakt source record 180770, score 9, is already current native Trakt rating title 6. Preserve it without duplicating the legacy seed or overwriting newer provider state. Preserve 33 AniList seed ratings and 48 AniList/30 Crunchyroll statuses with AniList precedence and Crunchyroll fallback.
- Preserve native manual episode completions, unwatch tombstone, five removed outbox entries, title aliases/corrections, provider watermarks and baseline floors. Canonical completion is a distinct episode union of watched/undated/manual minus unwatch; the current audited calculation is 4101 versus older raw/cutover projection 4103. Compare the same projection and retain native baseline behavior rather than manufacturing two events.

## Runtime, security and legacy callers

Native helper db already uses FLOOT_DATABASE_URL. importDb retains separately scoped local/Supabase resources. Trakt finish applies the remote six-feed snapshot then native incremental history; marker handling can disable a partial path, but this is not an atomic distributed transaction. Ending the remote half needs reviewed runtime changes, final source-evidence capture and rollback journal/application. Reimplement native owner checks for source auth.uid-dependent functions; retain native user 1 and explicitly crosswalk legacy owner c566e7e0-880a-430d-85df-c40484144a91. Do not clone auth.users or reuse source JWT/RLS policies blindly. Private-server native access requires endpoint owner tests and least-privilege grants.

Reviewed complete GitHub main tree (235 files, not truncated), SHA 142d22cc1d6edb1f107c9690623e2143be865809, matching Vercel production dpl_8zUAb5prgTaNtgJSRhmEqEKk5AKG. Retain marquee-beige.vercel.app, marquee-dave-0d82.vercel.app and git-main alias. Legacy web/src/data.js and supabase.js retain UI/auth/mutation clients. Ten GitHub workflows are manual workflow_dispatch, no cron schedules: AniList seed, Trakt import/auth, Crunchyroll probe/staging/import/backfill/comparison paths and legacy development helpers are retained manual callers. GitHub's Trakt token bundle is distinct from Floot's encrypted OAuth state; never substitute it without checking current ownership/rotation.

Trakt/Crunchyroll original n8n workflows remain inactive; AniList remains manual-only seed/comparison. Existing TMDb refresh remains unchanged. External bookmarks/manual clients/callbacks and live Vercel environment/auth redirect settings still require disposition/verification; the connector's project-detail wrapper failed, though deployment evidence was available. Supabase Edge Function/storage/cron inventory found no additional deployed Edge Functions, stored objects or cron.job table; this does not prove external client absence.

## Execution gates and rollback

Read database-consolidation/README.md and cutover-and-rollback.md. Keep archive evidence in a separate legacy namespace in the final design; preserve current native IDs/auth/manual state. Do not bulk-insert source history into active watched events or reinterpret undated completion dates. Preparation tables omit live triggers/defaults/active FKs intentionally; production DDL, secure backup, complete writer barrier and reverse-delta code remain future release work.

The final source delta must compare full primary-key/value sets including updates/deletes. Bound the per-app writer pause to 15 minutes, abort at 10 if gates cannot pass, drain all leases and external/manual callers, preserve latest native/manual/provider state and check canonical completion/date/precedence invariants before switching. Capture new writes/deletes after switch for reverse application if rolling back; restore old code/connections only after preserving those changes. Never restore an old shared-project snapshot over GameDeck.

Three policy/progress/Crunchyroll spec files passed; real-data count/hash/typed restore/replay/recovery/FK checks passed. Native end-to-end owner/API parity, writer-barrier enforcement and reverse-delta application remain gates. First unattended October 1–2 cycles are still pending; existing 08:00 America/New_York follow-ups are unchanged. Marquee monitoring ends after these two checks, unlike GameDeck weekly health monitoring; record the ongoing coverage gap without creating duplicate or unapproved tasks. Normal development continues; schema/auth/ingestion changes require a new dated rehearsal and invalidate relevant assumptions.
