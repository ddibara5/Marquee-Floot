# Marquee activation and rollback package

## Approved production rollover — 2026-10-01T23:38:14Z

Production execution/publication/live bindings/cutover under the prepared per-app plan are now explicitly approved by Dave, Marquee first then independently ready GameDeck. Read database-consolidation/production-rollover-handoff-20261001.md and production-authorization-20261001.json (in this directory for package files). No production pause or activation has started. Earlier dated pending/unauthorized statements are superseded for this migration only; actual frozen backup/drain/binding/delta/release/Auth gates remain. Retirement, revocation and native/EAS builds remain excluded. Do not ask for the same approval again.


## Fresh preparation milestone — 2026-10-01T23:08Z

Read fresh-preinstall-and-delta-evidence-20261001.json and the updated activation-execution-package-20261001.json. Pre-install encrypted source backup4d5576ff-c006-40f5-9028-bc8c96821785 restored21/34551 rows exactly; fixed native42 backup758cfa42-79a8-4f12-a108-2538e834ab3f restored42/36848 exactly. Native Auth4 is included in the fixed42 map, even though authEvidenceTables is0. These were pre-install captures, not frozen final captures/drain proof.

Preserve original backup receipt758cfa42-79a8-4f12-a108-2538e834ab3f unchanged: its original all42BindingsInstalled=true was an incorrect count-only label. Actual registry42 was candidate42/public0, and remains so with journal0/unreleasedleases0. Fixed physical runtime42 public bindings are absent. helpers/migrationRuntimeBackup.tsx now checks exact namespace/relation paths; checkpointbc8b2d72-e23e-4fa9-881a-7a43a4a61552. Protected archive/typed restore remain valid.

All five original historical archive rows still match complete source-row hashes;131 fragments/five assembled rows remain untouched. Sixth source row19bd2233-6053-496c-a58a-1f1630496cdd is additionally encrypted and exactly typed-restored by backup1deda4d4-f8d2-4556-a6d3-e7d90bdbaf07. Revalidate all six after actual freeze.

Three final bridge additions are prepared: Last Seen episode UUID8d0d1efa-b0d5-4614-aca7-9c7225cf3676 -> native287, its exact Trakt14210359 source mapping, and the Silo legacy seed rating9 (native current Trakt rating9 already agrees). Prospective read-only overlay resolves all represented event-target, mapping and seed conflicts; remaining6 history events/nine source mappings are the existing ONE PIECE exclusion. No production bridge/history/manual/current rating/outbox row changed. Preserve18 native-only dated events and18 newer completions.

A new isolated same-core private transaction rehearsal passed three additions, replay0, late-conflict atomic rejection and exact reverse. Receipteed96ff5-35f1-489c-b196-1e5fddeeb296; schemas exercise_marquee_bridge_20261001 / barrier_marquee_bridge_20261001, now open. Public bridge rows unchanged; original complete runner13 untouched. Code checkpointf0d67321-887c-4050-9e8d-ac07810a4f32; final bridge SQL now additionally requires operator approval GUC without setting it itself. prepared-final-bridge-delta-20261001.sql remains inert; source drain must be independently verified on the separate source resource before/after native apply. Attestation strings alone do not prove it.

Native Auth remains retained. Fixed backup authorization control was securely connected only for protected capture. Original CR/Trakt n8n workflows remain inactive; no unfinished imports, pending rating/watchlist actions or active outbox rows were observed. Exhausted published30-minute logs showed0 events at22:49:48Z, which is an observation, not enforced provider drain. No publication, live migration binding, production pause/cutover, retirement or credential revocation occurred. Scope clarification on “Proceed” is pending because the original user instruction expressly prohibited activation. Frozen final backups/drain/binding/release/owner read-write-undo remain required; maximum pause15minutes/abort10. Marquee goes first. Full production rollback remains unproven.

## Current execution package — 2026-10-01T22:08:39Z

Read activation-execution-package-20261001.md/.json and activation-preparation-evidence-20261001.json. Current backend checkpoint: ffd68172-d813-4b3a-b5f9-d9a060906ae6. Existing composed 13 and earlier source/runtime/audit/archive proof remain preserved; no completed retained runner was rerun.

The fixed native42 map remains public in this app's own resource; original-source21 remains separate. Native backup preparation now restores37068 exact rows plus6 protected operational catalogs/control hashes. The first saved uncompressed archive hit a runtime kill during restore and is retained; compressed transport and bounded insert batches passed full restore/replay. Live pre-install/final-window capture authorization is unset and both guards return503. These private backup IDs cannot stand in for fresh production captures.

Authenticated **current published rendering passed**: Home, Activity and title detail; Festering Resentment once under October1 and Ice once under September30, with39 watched/48 released; entry-asset fingerprints are saved. Exact raw authenticated JSON/status was not captured, and no current published manual write/undo or future migration release was accepted. Both retained Vercel deployments are READY at expected IDs/commits/domains. Fresh read-only config receipt e35e723e-1167-40f7-a053-8469425d90a2 found original Auth health200 and unchanged site/allowlist; server env remains opaque/unverified, not mismatched. No new legacy callback is selected.

Activation requires edits to the **source constants** in helpers/marqueeDatabaseMode.tsx; similarly named environment variables do not switch routing. Pre-install native/source snapshots and isolated restores precede live migration writes. Frozen final capture/delta follows exact installed binding/drain and deadline validation. A paused Auth gate cannot serve enrollment/login: after verified delta, keep source/provider jobs held while opening native only for the controlled owner acceptance phase. Keep existing native Auth; dual rollback reopening requires complete remote catchup and matching durable/native digest acknowledgement.

GameDeck auxiliary callers are unchanged. The fresh actual health graph is version f141431f-e301-451a-9851-50a6db25a698; remove only the seven reviewed GD nodes if separately approved, retaining HomeDeck schedule/branch/error route. Fresh sequential reads confirm all three auxiliary writer workflows active. Unknown manual/HA effects remain a no-go condition, not proved absent. Marquee is independent.

Fresh production backup/restore/delta, actual stopped/drained callers/provider effects, exact live bindings, approved publication and release/owner/unauthorized write/undo/native-client acceptance remain later gates. Maximum writer pause15minutes, abort decision10. October2 monitoring stays unchanged and is not a calendar hold. No production migration, publication, retirement or credential revocation has occurred; full production rollback remains unproven.


Updated 2026-10-01T20:56:48.510Z. **Prepared with open gates; not switch-ready.** Production is unchanged by migration preparation. No publish, cutover, live/public migration binding installation, service retirement or credential revocation is authorized. Preparation backups/restores, archives and completed audits remain preserved. Fresh final-window backups/restores and full production rollback are not proven.

Marquee's concrete retained-store factory and capability-protected operator endpoint are implemented. The same shared runner passed **13 actual separate-resource private checks**, receipt `0fce3393-6082-421f-a235-9b40907a45f6`: all-run preflight, chronological source recovery with the actual private SQL normalizer, real native acknowledgement transaction failure after remote commit, durable retry repair, zero-change replay, exact dates, retained Auth/manual values and restored gate/journal state. No provider transport occurred. Four focused spec files passed; full typecheck clean. The endpoint returned401 without authorization and503 while its package authorization is unset; production factory was not invoked. Complete runner proof is private, not full production rollback proof.

Code checkpoint: `13291d53-f3a3-4634-9fbd-f4406cc193a6`. Current evidence: retained-runner-checkpoint-20261001.md/.json; continuity: codex-handoff-20261001.md. Earlier runtime52/42 and cross-resource12 evidence remains in runtime-writer-checkpoint-20261001.json and writer-binding-checkpoint-20261001.json. Providers remain mocked or unused; native Auth/manual APIs, GameDeck enrollment/five RPCs and completed backups/audits are preserved.

## Separately authorized activation window

1. Close the app-specific remaining gates below; pin the reviewed Floot checkpoint and release, caller dispositions and exact source/native binding manifests. Retain the current production routes and schedules.
2. Capture fresh encrypted app-scoped backups and restore them in isolation; include protected Auth/config and identity associations. Existing preparation backups stay immutable; checkpoints are code/config restore points only.
3. Stop new app admission and provider sends. Drain native work, queued tasks and external effects. Expired leases or uncertain provider acceptance are not proof of drain. Do not affect the other app.
4. Install install-legacy-live-bindings-20261001.sql and the reviewed native binder only after separately authorized installation. The source installer leaves draining. Its approval/backup settings are attestations, not security or proof.
5. Verify ordered keys, relation/type/nullability/identity manifest, enabled exact gate/journal functions and native runtime bindings. Do not clear/rebind a journal-bearing registry.
6. Seal the quiescent full-key/value final delta, validate identity/FK/manual date/tombstone/source evidence, activate the approved app release, then perform owner/unauthorized API and controlled write/undo checks. Resume only after success. Maximum pause 15 minutes; abort at 10.


## Approved rollback scope

Marquee keeps its current native Floot Auth and integer identities in both routes. Its database rollback reconciles legacy history/evidence by canonical entity and legacy-owner crosswalk; it does not require rebuilding Supabase Auth.

Pause app writers/provider work, retain complete source pages, reconcile the 21-table remote snapshot and durable receipt, repair native markers idempotently, and validate dates/newer manual state/tombstones. Restore dual writes only after complete remote-half catchup is acknowledged. Failed/partial and committed unreconciled native pages remain retained. Verify native owner/API/client parity before resuming.

Preserve rotated provider credentials and uncertain delivery state; never automatically resend uncertain effects or reactivate replaced n8n jobs. This scope does not prove rebuilding a lost Auth service. legacy-auth-recovery-contract-20261001.json remains the unresolved disaster-recovery contract, reviewed before retiring the fallback. No paid branch is required for the selected retained-service scope.


## Routing and barrier states

| State | Legacy Marquee domain | Native Marquee domain | Trakt / login |
| --- | --- | --- | --- |
| Native active | Paused against old writers | Open | Native store / native Floot Auth |
| Rollback in progress | Paused; reviewed reconciliation only | Paused | No new writes / retained native identity |
| Dual-store rollback verified | Open | Open | Dual after complete catchup / native Floot Auth |

Do not resume dual writes until the durable remote receipt and native acknowledgement agree. External/auxiliary caller disposition remains required before installing the app table gates.


## Retained deployment binding

Read-only receipt a42ac73a-63b6-4b30-bf51-f5ebcc381ba6 identified prj_1ZrhbbtLTADMc4EmwnwigzMPXiCz, deployment dpl_8zUAb5prgTaNtgJSRhmEqEKk5AKG, domain https://marquee-beige.vercel.app. This is a dated reference, not automatic deployment approval or a fresh-window check. Served client bindings point to the original Supabase project; retained Vercel is auxiliary; native Floot deployment/client compatibility is the active path.

No new legacy callback is required for Marquee native authentication.


## Current-data verification — 2026-10-01T19:23:49.433Z

User requested verification now against last night's real watches. PASS: October1 published Crunchyroll scheduler09:00 UTC, all19 page tasks and finish succeeded; run e2de6dbd-56b1-41f3-9779-0fd8d1067c81 created two real dated completions. The Apothecary Diaries: Ice at Sep30 23:49:15 Eastern (source S2E15; canonical episode218), Festering Resentment at Oct1 00:16:06 Eastern (source S2E16; canonical episode219). Each has exactly one canonical event, with watched_at exactly equal to source_date. The current watch-history handler's Activity SQL returns both at the top of the first page; browser rendering/authenticated published response was not tested. Published anonymous watch-history request returns401.

October1 Trakt scheduler11:17 UTC and all36 page/finish tasks passed; run999145fe-b2f5-4ad7-ad35-ce6c755ebc58 committed both stores, without new Trakt history. Published log window08:55–11:25 UTC exhausted3pages/364events. Zero orphan watch events, active source leases, unfinished imports and partial-commit markers. Mapping/held backlogs remain preserved. This check did not trigger an import, mutate history or change production configuration. It closes the requested present-data verification; October2 unattended follow-up remains a future observation and must not be represented as already run. Continue independent cutover-package preparation now; frozen backup/drain, actual bindings, release/client acceptance and separate authorization remain required.



## Concrete native binding package

prepared-native-live-binding-20261001.sql is rendered for Floot Database for Marquee Floot Pilot, public tables and barrier_marquee_20260930_v2. Its42 table mappings exactly match migrationRuntimeBindings and all42 native public relations. Read-only observation: existing barrier journal0 and public bindings0. The separate source installer remains install-legacy-live-bindings-20261001.sql on the guarded original PostgreSQL resource, covering21 shapes. No installer was executed.

The future approved release sets MARQUEE_TRAKT_STORE='native' and MARQUEE_BARRIER_ACTIVE=true only after frozen drain, fresh backup/restore, engine prerequisites and exact source/native binding verification. Keep existing native Auth and public identity; use a fresh reviewed barrier/baseline if journal/schema drift invalidates this selection. Current controls stay dual/barrier false. This fills in the installation target and switch settings; it does not prove final-window execution, authenticated published client acceptance or full production rollback.



## Remaining gates

- Approved-window freeze/drain and any then-current remote-half reconciliation; private recovery is proven, a frozen production drain is not.
- Fresh secure app-scoped final-window backups with isolated restores and full-key/value deltas.
- Exact live native42/source21 bindings, retained release/environment checks and authenticated client read/write/undo acceptance against the approved release.
- Separate per-app authorization for installation, publication and production activation; no automatic resume or switch.

Marquee first, then independently ready GameDeck. Required GameDeck scheduled checks and Marquee October1 real current-data acceptance passed. October2 is continuing monitoring, not a calendar blocker; keep the follow-up. No production writer resume. All private barriers are open and no exercise is running at handoff.

## Owner API acceptance and session comparison

Actual preview native session200/exact owner1 and authenticated history60 passed at2026-10-01T20:02:55.656Z. Ice2603 and Festering Resentment2602 each appeared once with exact source title/date; credentials omitted returned401. Rendering and authenticated published-release response remain untested. Normal session access may update public.sessions.last_accessed and expired-session/cookie bookkeeping; verification made no history/import/configuration change. Two initial runner attempts passed12 recovery checks then failed the live-session hash. Final comparison selects active sessions and excludes last_accessed; corrected complete exercise passed13. Explicit canonical registry qualification replaced search_path-dependent regclass::text. Failed private attempts remain recorded.
