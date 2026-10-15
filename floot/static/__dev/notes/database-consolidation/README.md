# Marquee database consolidation tools and evidence

## Current operator entry point — October 2, 2026

Marquee's native production consolidation is complete. Read production-rollover-handoff-20261001.md and the current activation-execution-package-20261001.md/.json first; detailed production evidence is production-execution-evidence-20261001.json. Completed GD22/MQ13, snapshots, failures and private deltas stay immutable. Native providers are open and retained source writers held; original services/credentials are retained. Future recovery needs fresh drain/frozen protection/exact bindings/current-batch proof and release acceptance; expiry never resumes writers. Retirement, revocation and native/EAS builds remain excluded. Full Auth disaster reconstruction/device acceptance remain unproven. See https://chatgpt.com/space/page_dc47939d2d44819188dae206b4ee668d .

## Historical September 30–October 1 tool instructions

The older preparation status below is historical and does not describe current routing; preserve it as evidence. Do not rerun completed fixtures or blindly recreate/rebind existing schemas.

Current handoff/status: retained-runner-checkpoint-20261001.md/.json, activation-review-20261001.md/.json and codex-handoff-20261001.md. Preserve implementation-checkpoint-20260930.md/.json as immutable earlier evidence. Read these before older baseline instructions. Private runtime candidates and isolated safeguard tests now exist, but complete production wiring/end-to-end rollback remain gates. safeguards.sql + safeguards-extension.sql hold the engine; safeguards-rehearsal.mjs reads its 25 passed evidence rows only. Mutation rehearsals use Floot execute_sql, not the read-only VM proxy. Marquee resume-historical-archive.mjs defaults to status and must not run backup/restore actions until preparation resumes. No jobs are left copying at this checkpoint.

These are inert preparation tools for the corresponding Floot project VM. They do not promote a database or publish an application. Read the app's database-consolidation.md and cutover-and-rollback.md first.

## Execution

Use Floot run_code_in_vm, with its connected resource names; no connection secrets belong in scripts or chat. Source resource is PostgreSQL Database. GameDeck target is Floot Database for GameDeck; Marquee target is Floot Database for Marquee Floot Pilot. Generic scripts have a CONFIG placeholder; replace it in memory with the matching app, schema, source and target. The dated isolation guard deliberately rejects other schemas. A new dated snapshot needs an explicit reviewed guard change, never an overwrite of the current manifest.

- rehearse.mjs: generic exact PostgreSQL JSON copy, row fingerprints, replay gate, typed restore and one-row restore probe. Run bounded app parts rather than a single long job.
- gamedeck-rehearse-part-1 through 8: 35 source/core/auxiliary/archive tables.
- marquee-rehearse-part-1 through 8: 21 source tables. Part 7 validates/restores raw evidence after the compressed transfer.
- marquee-rehearse-native.mjs: authoritative 34-table native snapshot list. Older marquee-rehearse.mjs contains an obsolete native list; do not use its nativeTables configuration.
- marquee-copy-raw-compressed.mjs followed by marquee-complete-raw-keyset.mjs: large evidence transfer and mandatory complete key-set reconciliation. A public fixed phrase is a compression transport mechanism, not secure credential storage. Interrupted parallel transfer can leave holes below the maximum key. Never use max-key completeness alone.
- validate-isolated.mjs: read-only source-manifest/backup/typed hashes, available FK orphan checks and PUBLIC grants check. Legacy auth.users references are retained UUID evidence, not native auth identities.
- marquee-compare.mjs: read-only cross-store comparison before the explicit candidate bridge. Its reported Last Seen target conflict is resolved by the separately recorded private bridge; it does not automatically apply that bridge.
- marquee-reconcile-rehearsal.sql: isolated Last Seen crosswalk and history reconciliation views, with provider-ID and season/episode evidence. No live events or dates changed.
- delta-plan.mjs: read-only full key/value comparison of live source against archive; reports insert/update/delete counts, with before/after drift guards. A plan while writers run is not a frozen final delta, nor a reverse migration implementation.
- source-catalog.json: app-scoped columns, constraints, indexes, defaults, triggers, RLS, grants, views and RPC definitions. Production DDL and owner-auth rewrites still need reviewed implementation.

## Safety and verification

All writes are restricted to the private prep schemas. PUBLIC schema usage is revoked. No source writes, active auth copies, provider calls or schedules are included. Per-table source counts/hashes must remain stable before and after copying. Cross-table atomicity is not claimed. PostgreSQL JSON text preserves exact numeric values; C collation avoids cross-resource ordering differences. MD5 is an integrity/reconciliation fingerprint, not a security primitive.

Archive and typed tables preserve original UUID/bigint keys and timestamps. Typed tables omit application defaults, triggers, auth policies and active foreign keys. Do not rename them into public. The manifest, not a potentially lost VM completion envelope, determines which stages completed; re-read live validation after any uncertain job outcome.

Tests include restored typed values, zero-row replay, incomplete-copy recovery, FK orphan checks, source-history comparisons and existing app policy suites. Private runtime native Auth/API/RPC and writer/recovery proofs are recorded; actual final-window binding/drain/client acceptance and full production rollback remain release gates. A checkpoint restores code/config only; it is not a database or auth backup.

## Latest retained-runner preparation

Marquee's concrete retained-store factory and capability-protected operator endpoint are implemented. The same shared runner passed **13 actual separate-resource private checks**, receipt `0fce3393-6082-421f-a235-9b40907a45f6`: all-run preflight, chronological source recovery with the actual private SQL normalizer, real native acknowledgement transaction failure after remote commit, durable retry repair, zero-change replay, exact dates, retained Auth/manual values and restored gate/journal state. No provider transport occurred. Four focused spec files passed; full typecheck clean. The endpoint returned401 without authorization and503 while its package authorization is unset; production factory was not invoked. Complete runner proof is private, not full production rollback proof.

Production is unchanged by migration preparation. No publish, cutover, live/public migration binding installation, service retirement or credential revocation is authorized. Preparation backups/restores, archives and completed audits remain preserved. Fresh final-window backups/restores and full production rollback are not proven.

Saved private fixture SQL is evidence/setup, not permission to recreate completed schemas or install production bindings. Read codex-handoff-20261001.md before continuing.
