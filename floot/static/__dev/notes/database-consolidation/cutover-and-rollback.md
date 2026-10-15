# Database consolidation execution contract

## Current production status — October 2, 2026

Marquee is accepted on native production at https://marquee-ddibara.floot.app, release checkpoint 06dfb0dc-d35f-4d65-8ad3-d25268ad4c4b / publication 78d518e6-80b9-40fc-90e1-3f619cfcf472. Native UI/Auth/manual/history and native-only Trakt routing are published. Exact native 42/source 21 bindings, actual drain, fresh frozen backups and exact restores, three approved bridge additions/replay 0, owner/anonymous/write/Undo and first native Trakt run 57 passed. October 1–2 unattended source cycles are verified in the living plan. Native providers remain open; retained source writers remain paused. The final recorded checks were native control/work at 2026-10-02T13:16:11Z and source gate/21 bindings at 13:33:48Z. No new Marquee publication was needed for the GameDeck completion.

Marquee's explicit resume decision occurred at 10m29s: the minute-10 requirement was missed by 29 seconds; the maximum 15-minute pause was met. This deviation is preserved without backdating. MQ13, all 131 archive parts, six full historical rows, frozen backups and private delta evidence remain preserved. Original services/credentials/releases are retained; no retirement, revocation or native/EAS build occurred. Full production/Auth disaster reconstruction and installed-device acceptance remain unproven. Permanent Marquee monitoring remains unassigned after the completed two-check follow-up; no new schedule is implied.

Current technical sources: static/__dev/notes/database-consolidation/production-rollover-handoff-20261001.md, activation-execution-package-20261001.md/.json and production-execution-evidence-20261001.json. Evidence through 2026-10-02T13:36Z; publication status was reread during this documentation reconciliation. Living plan: https://chatgpt.com/space/page_dc47939d2d44819188dae206b4ee668d .

## Historical activation contract and handoff

Older pending statements below describe their recorded preparation date and are superseded for the completed consolidation. Keep the fixed backup/drain/binding/delta/Auth safety contracts for a future specifically authorized recovery. Historical frozen clocks and proof receipts must never be renewed merely by changing a timestamp.

Current operator sequence and fixed target/backup/release controls: activation-execution-package-20261001.md/.json. Latest published rendering and private runtime backup/restore evidence: activation-preparation-evidence-20261001.json. Earlier dated sections remain historical; this package is preparation only, with fresh production gates still open.

Prepared September 30, 2026. Preparation is authorized; production database/authentication switches, functional publishing, retirement and credential revocation are not. Treat each app independently. Keep production ingestion operating until an explicitly approved cutover window.

## Preparation and production are separate

The private `prep_gamedeck_20260930` and `prep_marquee_20260930` schemas are archival snapshots and rehearsal tables, never application connection targets. `b_*` holds original PostgreSQL JSON with per-row fingerprints. `t_*` is a typed restoration preserving original values, precision, nullability and PK/unique/check constraints. `n_*` holds Marquee native state. Snapshot manifests use explicit C collation and label the preparation as non-atomic. Copies have no application triggers, background consumers or fabricated event times. Do not rename them into public or point a production app at them.

Source metadata, RLS, grants, RPCs, views, defaults, sequences and triggers are inventoried. Snapshot restoration deliberately omits defaults, triggers and active foreign keys; validation checks available FK relationships separately. Production DDL and runtime adapters need their own reviewed implementation and tests. A source snapshot passing does not establish native authentication, RPC parity or end-to-end app parity.

## Current implementation evidence — 2026-10-01T04:59:21.698Z

Read implementation-checkpoint-20260930.md/.json, runtime-writer-checkpoint-20261001.json and activation-review-20261001.md/.json. Marquee passed 52 actual-handler private checks across 42 shapes; expanded repeat run, focused specs and typecheck passed. GameDeck owner identity_map is now journaled, native FK closure tested, actual enrollment/login/session/logout/REST and five RPCs verified. Marquee atomic registration/login/session/logout and manual tracking tested. Provider/legacy identity transport remains mocked; composed production rollback is unproven.

Runtime binding must match the single reviewed schema selection and exact physical table/key/enabled gate+journal manifest. The inert installer remains an approved-window step. Preserve existing journal history when selecting a fresh barrier/baseline. Native push claims and uncertain acceptance, Trakt tombstones and rotated credentials remain change-preserving rollback data.

## Next execution sequence

1. Preserve the passed GameDeck scheduled checks through October1 09:00 Eastern and Marquee October1 current-data production acceptance. October2 remains monitoring, not a required date hold. Continue verifying new drift in the approved final window. All required roots must have genuine published invocation evidence, terminal successful persisted runs, released leases, and no unexplained data loss. Manual replay is not cron evidence. Do not duplicate follow-up automations. Record that Marquee's two-check task expires and ongoing monitoring is still unassigned.
2. Finish the unpublished runtime adapter/authentication package separately from these inert records. GameDeck must replace browser Supabase REST/RPC/GoTrue calls with owner-guarded native endpoints, preserve current input/output contracts, port daily delta and synthetic-duplicate semantics, and route every source/token/alert writer to its own database. Preserve manual-state event timestamps; bulk import must never invoke manual-status triggers. Marquee keeps existing native auth and integer IDs, adds the evidenced legacy crosswalk/archive bridge, and removes the remote half of dual-store Trakt commits only in the reviewed cutover package. AniList stays manual, not a new schedule.
3. Validate owner authorization and anonymous/non-owner rejection, error/retry/partial-commit behavior, provider credential refresh, history replay, manual ratings/wishlist/unwatch/writeback tombstones, and current UI/native-client compatibility against an isolated candidate. Prepare a real reverse-delta writer and test its journal/tombstones before release. New endpoint shapes cannot break installed native Marquee clients.
4. Obtain explicit per-app cutover approval referencing the reviewed release/checkpoint, backup IDs, complete caller disposition, auth choice, measurable gates and bounded window. GameDeck secure native password enrollment is selected; activation and enrollment remain disabled pending separate approval. Use secure credential/resource entry; never paste secrets into chat. This approval does not retire Vercel, Supabase, Game Pass, News or unrelated workflows.
5. Before any production migration write, obtain a fresh, encrypted, restorable **app-scoped** database/data backup of both affected sides, schema/constraints/functions/grants/sequence states, identity associations, and protected token/subscription material through server-only handling. Verify restore on an isolated database. Existing ingestion pre-commit snapshots and these rehearsal copies cover data subsets; they are not complete authentication/credential/platform backups. A Floot checkpoint restores code/config only.

## Bounded pause and final delta

Maximum planned writer pause: 15 minutes per app, with abort decision by minute 10 if final copy/verification is not complete. App-local durable guards, admission and gate/journal triggers are implemented and privately tested. Live physical binding and approved legacy/external caller enforcement must be in place before the window; no production-wide enforcement is claimed.

At the approved window: record exact modes/cadences and deployment IDs; block that app's UI/manual/source/writeback/credential-refresh writers, stop admitting new jobs, drain all tasks/leases and confirm zero running commits. The legacy browser and manual GitHub/service-role paths also require a tested app-scoped write barrier. Do not revoke shared credentials or alter the other app. Retained Game Pass/News may continue only against their explicitly retained auxiliary legacy stores; classify them outside the new active domain and make old health/report readers aware of the transition. If they touch active migration tables, the window cannot proceed without a separately authorized disposition.

Generate a fresh consistent source snapshot once quiescent. Compare the **complete primary-key set and every row value**, detecting insert/update/delete; timestamps alone miss deletions, immutable history and manual tombstones. Rerun identity mappings, exclusions, source evidence and typed restore gates. Never mutate September 30 immutable backups to pretend they are current. Use a new dated preparation schema/run ID; change the isolated schema guard deliberately when generating that run.

Apply a reviewed transaction to the approved destination, with prevalidated PK/FKs/unique/check constraints, intentional defaults/sequence positions, and runtime triggers enabled only after bulk historical loading. Preserve original event dates, source record IDs, manual timestamps and removed/pending writeback state. Import operational controls disabled with cleared leases; preserve real watermarks/cursors and credential expiration without replaying old tasks. Switch one app's connection/auth routing, verify authenticated read parity, reject unauthorized access, then perform one controlled write and its undo. Resume that app's writers once checks pass, using the recorded native schedules. Keep a change journal from the first post-switch write and monitor the first resumed imports.

## Measurable go/no-go gates

- Required October1 scheduled/current-data checks passed; continuing monitoring and fresh-window drift remain required. October2 is monitoring, not a calendar blocker.
- Zero unexplained missing/changed history, lost manual state, source-date drift, cross-app tables or exposed credentials.
- GameDeck all current games/history/ranks/comparisons/ratings/wishlist/status-event rows accounted for; first-seen snapshots remain distinct from measured activity; automatic status behavior agrees with the current helper.
- Marquee every nonexcluded source event maps to the same canonical entity/date; source exclusions retained in archive; all undated completions/evidence/date decisions retained; no imported completion becomes watched today. Canonical episode counts deduplicate dated/undated/manual evidence and subtract explicit unwatch. AniList precedence and Crunchyroll fallback agree with current UI. Preserve newer native events, ratings/watchlist pending choices and removed outbox records.
- Zero duplicate source event keys, dangling active FKs, alias cycles, manual-locked mapping conflicts or unaccounted deletes. Idempotent replay changes zero history rows.
- Complete writer barrier, zero active leases/tasks, tested provider refresh and authorized/unauthorized endpoint behavior.
- Fresh complete app-scoped backups restored successfully; reverse delta and rollback tests passed; old production release remains available.
- Any schema/auth/identity/mapping/date-policy/ingestion change since rehearsal invalidates the affected gates and requires an updated baseline. Layout-only development can continue.

## Rollback

Before switching connections: abort the candidate promotion, retain its manifests, lift the app-specific maintenance barrier and restore recorded writer modes. No production data restoration is needed because source remains authoritative.

After switching: first pause new writers and drain tasks. Capture all changes since cutover, including deletes, manual choices, newly dated source events, token refreshes and writeback delivery/removal state. Apply the tested reverse delta into the retained source with original IDs/dates and explicit crosswalks; do not overwrite newer manual state with an old snapshot. Validate complete key sets, row fingerprints, manual/tombstone state and source watermarks. Restore the recorded pre-cutover release/connections, perform owner read/write/undo checks, then lift the barrier and restore native ingestion modes on the retained source. Do not automatically reactivate replaced n8n jobs. If reverse reconciliation fails, remain paused and recover from the fresh scoped backup plus journal; never restore the entire shared Supabase project over the other app.

Retirement and credential cleanup are later, separately approved milestones after monitoring and reader/caller migration are complete. 

## Recovery continuation — 2026-10-01T16:53:16.419Z

Read recovery-checkpoint-20261001.md/.json for the current resumable evidence. Marquee: 12 private recovery checks passed (`13bce7fe-7860-40c4-9def-52e1a4f2bf9b`). Floot native resource private legacy-shaped clone; does not establish real cross-host Supabase recovery. completeTraktSnapshot.spec.tsx passed (8 specs); typecheck clean. The private barriers are open. Running legacy Auth restoration, real cross-resource production rollback, complete external writer enforcement and public bindings remain unproven. Read-only environment review found legacy Floot redirects not explicitly allowlisted and GameDeck production environment values opaque/unverified; no environment or callback change was applied. Preserve prior audit/backup records. No production switch or publication is authorized.


## Current source-writer and cross-resource package

Read activation-review-20261001.md/.json and writer-binding-checkpoint-20261001.json for current evidence. Marquee: 12 real cross-resource private recovery checks passed; receipt cea065af-5ac8-4017-8683-e1e79e1ecabd. Legacy source-resource gates cover 21 shapes in private role/phase/operation tests; installer manifests and exact verification passed privately. Production live-table bindings remain uninstalled. All private barriers are open, both typechecks and focused specs clean. The user approved retained-service rollback. Marquee preserves native Floot Auth in both directions and reconciles legacy domain data by UUID crosswalk; a running GoTrue restore is not a Marquee cutover gate. Read retained-service-rollback-checkpoint-20261001.json and the current activation-review. Full legacy Auth disaster restoration remains separate and unproven; old Auth/services/credentials must not be retired. Final-window backups remain a later gate; existing immutable backups/audits are preserved. Keep the original technical records as dated evidence. Production unchanged; no publish/cutover/retirement/revocation.

## Current handoff — 2026-10-01T20:56:48.510Z

This section supersedes earlier dated statements about unfinished wiring or October2 as a calendar gate. Read retained-runner-checkpoint-20261001.md/.json, activation-review-20261001.md/.json and codex-handoff-20261001.md.

Marquee's concrete retained-store factory and capability-protected operator endpoint are implemented. The same shared runner passed **13 actual separate-resource private checks**, receipt `0fce3393-6082-421f-a235-9b40907a45f6`: all-run preflight, chronological source recovery with the actual private SQL normalizer, real native acknowledgement transaction failure after remote commit, durable retry repair, zero-change replay, exact dates, retained Auth/manual values and restored gate/journal state. No provider transport occurred. Four focused spec files passed; full typecheck clean. The endpoint returned401 without authorization and503 while its package authorization is unset; production factory was not invoked. Complete runner proof is private, not full production rollback proof.

Production is unchanged by migration preparation. No publish, cutover, live/public migration binding installation, service retirement or credential revocation is authorized. Preparation backups/restores, archives and completed audits remain preserved. Fresh final-window backups/restores and full production rollback are not proven.

Remaining:

- Approved-window freeze/drain and any then-current remote-half reconciliation; private recovery is proven, a frozen production drain is not.
- Fresh secure app-scoped final-window backups with isolated restores and full-key/value deltas.
- Exact live native42/source21 bindings, retained release/environment checks and authenticated client read/write/undo acceptance against the approved release.
- Separate per-app authorization for installation, publication and production activation; no automatic resume or switch.

Owner read-only access is preparation evidence; fresh backend batch/digest-bound Auth evidence and backup/drain attestations are different gates. Both rollback invocation authorization variables are unset; actual preview rejection401/503 passed without factory execution. No automatic routing change or writer resume. Existing private exercise barriers are open. Maximum future pause15minutes, abort10.

Normal preview Auth/session access may update public.sessions.last_accessed and expired-session/cookie housekeeping; no import/history/configuration change was performed.
