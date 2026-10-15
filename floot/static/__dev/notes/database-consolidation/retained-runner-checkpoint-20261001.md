# Marquee retained runner checkpoint

Updated 2026-10-01T20:56:48.510Z.

Marquee's concrete retained-store factory and capability-protected operator endpoint are implemented. The same shared runner passed **13 actual separate-resource private checks**, receipt `0fce3393-6082-421f-a235-9b40907a45f6`: all-run preflight, chronological source recovery with the actual private SQL normalizer, real native acknowledgement transaction failure after remote commit, durable retry repair, zero-change replay, exact dates, retained Auth/manual values and restored gate/journal state. No provider transport occurred. Four focused spec files passed; full typecheck clean. The endpoint returned401 without authorization and503 while its package authorization is unset; production factory was not invoked. Complete runner proof is private, not full production rollback proof.

Production is unchanged by migration preparation. No publish, cutover, live/public migration binding installation, service retirement or credential revocation is authorized. Preparation backups/restores, archives and completed audits remain preserved. Fresh final-window backups/restores and full production rollback are not proven.

Detailed machine-readable proof, limits, corrected attempts and remaining work: retained-runner-checkpoint-20261001.json. Current activation contract: activation-review-20261001.md/.json. Full continuity note: codex-handoff-20261001.md.

Remaining:

- Approved-window freeze/drain and any then-current remote-half reconciliation; private recovery is proven, a frozen production drain is not.
- Fresh secure app-scoped final-window backups with isolated restores and full-key/value deltas.
- Exact live native42/source21 bindings, retained release/environment checks and authenticated client read/write/undo acceptance against the approved release.
- Separate per-app authorization for installation, publication and production activation; no automatic resume or switch.
