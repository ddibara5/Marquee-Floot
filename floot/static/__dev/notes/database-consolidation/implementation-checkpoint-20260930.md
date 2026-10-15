# Marquee implementation checkpoint

Updated 2026-10-01T04:59:21.698Z. No preparation operation is currently running. Production database/Auth paths, ingestion and published releases are unchanged. Neither app is switch-ready. GameDeck secure native enrollment is selected and remains disabled.

## Current implementation and evidence

- Latest actual-handler private exercise: **52/52 checks passed across 42 registered runtime/Auth table shapes**. Receipt `92422c32-cec2-468c-a82e-1f466522dd6a`; 53 chronological mutations preserved in the retained native fixture. The expanded run passed twice. Not every table is mutated by the fixture.
- Actual password login, secure cookie issuance, session validation/expiry and logout contracts passed. Wrong passwords, anonymous requests and mid-request lost leases are handled correctly. Session cleanup now preserves valid idle sessions by using expiry.
- Commit registration user, password and session together under serialized case-insensitive duplicate checking. Exercise actual login/session/logout/registration and tracking rating/viewing/unwatch/canonical-title rejection. Preserve source watch-history rows when the actual tracking endpoint records unwatch tombstones.
- Actual handler paths are backend factories with fixed production defaults and private injected dependencies; request schemas remain unchanged. Provider/legacy-identity transport uses mock fixtures; no real token or native account was enrolled.
- Full registered key/value parity, real FK/conflict failed-apply atomicity, replay-zero, private sequence allocation and unchanged public sequences passed. The actual signed session, canonical per-user manual rating/viewing choice/unwatch tombstone, encrypted fixture credentials and historical removal receipts survive transfer.
- Focused specs: 2 files passed, including 10 writer unit assertions; typecheck clean. Source/retained fixture barriers open, zero unresolved leases and zero disabled user triggers.
- Failed attempts and recovery batches are retained in runtime-writer-checkpoint-20261001.json. Completed audits, backups and isolated safeguard suites are preserved; no source audit or backup was restarted.

## Rollback scope and remaining gates

The verified transfer uses identical-schema retained native fixtures. GameDeck production rollback composes retained legacy domain/GoTrue access with preserved native integer-ID Auth and crosswalk state; native bcrypt credentials must not be inserted into shared legacy GoTrue tables. Marquee retains its existing native Auth/manual store while legacy history/evidence and dual-write reconciliation remain separate. These composed production paths are not proven by native fixture equality.

- Finish retained legacy/Supabase domain reconciliation and running Auth-service recovery proof; identical-schema native fixture transfer does not establish the composed production rollback
- Complete reviewed legacy/browser/manual/external writer enforcement and physical live-table journal binding in an authorized window; preserve the completed caller audit and existing legacy auxiliary-service dispositions
- Resolve remaining sensitive environment and redirect/callback bindings; retain existing legacy owner access separately from new native password enrollment
- Refresh current drift and create final cutover-window encrypted backups with isolated restore verification
- Collect the existing October 1–2 unattended evidence and decide Marquee ongoing monitoring without duplicate followups
- Review separate GameDeck and Marquee activation/rollback packages; maximum pause 15 minutes, abort at 10; publishing and cutover remain unauthorized

## Resume records

Read this JSON counterpart and runtime-writer-checkpoint-20261001.json. Actual Auth/API harness: helpers/migrationAuthApiExercise.tsx plus helpers/migrationRuntimeExercise.tsx. Physical binding: runtime-binding-20261001.sql and bind-runtime-tables-20261001.sql. Activation review: activation-review-20261001.md/.json. Scripts remain inert for production. Code checkpoints restore code/config only, not database/Auth/deployment state. Studio remains canonical; existing scheduled followups remain unchanged.

## Earlier checkpoint (historical)

# marquee implementation checkpoint

Updated 2026-10-01T04:11:14.585Z. No operation is currently running. Production database/auth paths and published releases are unchanged; neither app is switch-ready. Backups remain preparation snapshots rather than final cutover-window backups.

Marquee: archive131/131 parts encrypted/decrypt-verified/typed-restored;112/112raw slices and19/19sections. Four smaller whole rows restored; all5assembled original-row hashes match and source hashes checked before/after. Fresh21-table legacy backup1fbf9bd5-00f1-4eee-a9f1-1138d10279c8 restored with15Auth evidence tables; native42-table package retained. Four policy/progress/matching spec files passed. Sequence isolation defect corrected:14defaults and ownerships are private;7real normalizer checks rerun successfully with16public sequences unchanged. Earlier rollback rehearsals may have consumed public sequence values; no public sequence was reset.

Both apps have32passing isolated safeguard checks. New transfer tests preserve inserts/updates/deletes, historical timestamps, manual choices/tombstones, rotated fixture tokens and exact bigint/numeric values; replay applies zero. Identity-key moves and duplicate/null source keys fail or apply as expected; postimage conflicts roll back atomically. Full end-to-end production rollback remains unproven.

Important rollback distinction: seal_rollback_transfer uses chronological before-to-after journal operations into the retained prior store. seal_journal(reverse_direction=true) is an undo fixture, not preservation of new post-switch changes. Never replace new changes with an old snapshot, restore shared Supabase over the other app, or automatically reactivate replaced n8n workflows.


## Current runtime implementation — 2026-10-01T04:11:14.585Z

- **33/33 private real-database checks passed**, covering pause enforcement and complete primary-key/value comparisons across **42 runtime/native Auth table shapes**. Success receipt: `1a23062b-0b2a-48d5-821e-7d54dd84b690`; 23 chronological mutations preserved in the retained private fixture, replay zero, real FK/conflict failures atomic, private sequence allocation valid and public sequences unchanged. Not every table is mutated by this exercise.
- Actual session helper and encrypted Trakt token refresh/history-writeback adapters are exercised against private rows with mocked transports. Reject expired native sessions in the actual session helper. Guard direct Trakt token refresh and history writeback with durable work leases. Validate provider tokens before encryption/update; preserve uncertain accepted writes and removal tombstones.
- Exact physical relation, primary-key and enabled gate/journal binding is checked before admitted work. The inert installer passed a two-table private rebind and idempotent repeat; public tables were not altered. Runtime expects public native tables; candidate-only registry coverage cannot authorize activation. Install reviewed live bindings only in an approved window. A journal-bearing registry cannot be rebound without a new reviewed baseline.
- Focused regression suite: 2 spec files passed, including the existing10 writer assertions; typecheck clean. Fixture/candidate barriers open, zero unresolved leases and no disabled gate/journal trigger.
- Failed private attempts are retained in the JSON evidence; partial fixture changes were sealed and transferred before rerunning. No failed attempt is counted as successful.

## Remaining preparation

- Rehearse the remaining native Auth/enrollment, RPC/API and canonical-ID crosswalk paths with retained legacy-store semantics; complete production end-to-end rollback is not yet proven
- Apply the reviewed physical runtime binding only in an authorized window; complete legacy/browser/manual/external writer disposition and enforcement, without redoing the completed caller audit
- Resolve remaining sensitive environment/redirect/callback bindings and preserve app-scoped credential recovery through server-only handling
- Refresh drift and create final cutover-window backups; running legacy GoTrue restoration remains distinct from isolated native Auth row/session proof
- Collect existing October 1–2 unattended evidence; decide Marquee ongoing monitoring without duplicating followups
- Prepare separate per-app activation/rollback approval packages; maximum writer pause15minutes and abort10, with GameDeck secure enrollment still disabled

Secure GameDeck native enrollment is selected and stays disabled. No credentials are missing. Completed audits, backups and safeguards remain valid and must not be restarted. Existing followups are unchanged. Production enforcement, complete legacy/native Auth/API/RPC/crosswalk recovery and full production end-to-end rollback are still unproven. Do not publish, switch stores, retire services or revoke credentials.

Read this JSON counterpart, `runtime-writer-checkpoint-20261001.json`, `runtime-binding-20261001.sql`, `bind-runtime-tables-20261001.sql` and durable database receipts when resuming. New fixture expansion is recorded in `expand-runtime-fixture-tables-20261001.sql`. Checkpoints restore code/config only, not database/Auth/deployment state. Studio remains canonical.

## Earlier runtime evidence (superseded by current results)
## Runtime writer and rollback verification — 2026-10-01T03:22:20.899Z

- Independent unpublished app guards cover 27 API endpoints, native auth/session writes, Kysely and raw-SQL commit boundaries, queued import phases and asynchronous provider/push/writeback effects. Activation remains disabled (barrier inactive; Trakt remains dual).
- Latest private HTTP exercise receipt `793bfef1-2c1b-4366-b31f-9b5e501eb49b`: **19/19 checks passed**, 14 real table shapes; 9 chronological mutations transferred. Password/session signing, owner crosswalk, manual changes, historical timestamps, fixture-token changes, mocked outbound effects, concurrent pause, draining/expiry/terminal lease checks, failed-apply atomicity, real FK rejection, exact hashes, replay-zero and sequence allocation passed.
- **10 new writer unit assertions passed; typecheck clean.** No public sequence changed during the successful exercise; no public sequence was reset. No test lease remains unresolved, fixture barriers are open and no operation is running.
- Corrected self-lock: admission uses shared lease row locks; renewal occurs at the work boundary. Corrected deferred-FK apply ordering: constraints are checked before user triggers are reenabled. Failed private fixture attempts remain evidence, not passed tests. Abandoned fixture lease was released only after confirming no active test backend; three fixture auth changes were restored. Later sealed test batches were applied only to the retained private fixture.
- This is representative real-database integration, **not complete production end-to-end rollback**: external effects mocked, fixture identity mapping used, not every production table/API/provider/GoTrue path exercised. Do not enable flags, publish, switch stores, retire services or revoke credentials.

New evidence: `runtime-writer-checkpoint-20261001.json`; harness: `helpers/migrationRuntimeExercise.tsx`; engine: `runtime-admission-20261001.sql` plus corrected `safeguards-hardening-20261001.sql`. Existing completed audits and backup receipts are preserved.

## Recovery continuation — 2026-10-01T16:53:16.419Z

Read recovery-checkpoint-20261001.md/.json for the current resumable evidence. Marquee: 12 private recovery checks passed (`13bce7fe-7860-40c4-9def-52e1a4f2bf9b`). Floot native resource private legacy-shaped clone; does not establish real cross-host Supabase recovery. completeTraktSnapshot.spec.tsx passed (8 specs); typecheck clean. The private barriers are open. Running legacy Auth restoration, real cross-resource production rollback, complete external writer enforcement and public bindings remain unproven. Read-only environment review found legacy Floot redirects not explicitly allowlisted and GameDeck production environment values opaque/unverified; no environment or callback change was applied. Preserve prior audit/backup records. No production switch or publication is authorized.


## Current source-writer and cross-resource package

Read activation-review-20261001.md/.json and writer-binding-checkpoint-20261001.json for current evidence. Marquee: 12 real cross-resource private recovery checks passed; receipt cea065af-5ac8-4017-8683-e1e79e1ecabd. Legacy source-resource gates cover 21 shapes in private role/phase/operation tests; installer manifests and exact verification passed privately. Production live-table bindings remain uninstalled. All private barriers are open, both typechecks and focused specs clean. Running legacy Auth restoration requires a separate compatible environment; legacy-auth-recovery-contract-20261001.json defines acceptance. Final-window backups remain a later gate; existing immutable backups/audits are preserved. Keep the original technical records as dated evidence. Production unchanged; no publish/cutover/retirement/revocation.
