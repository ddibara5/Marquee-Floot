# Visual review Batch A (Oct 12, 2026)

Dave: "Go batch A" after the Oct 12 visual review (Claude artifact "Marquee Visual Review"). UI only; no endpoint, schema, data, sync or schedule change.

- pages/$.tsx (+ pageLayout [UserRoute, AppShell]): catch-all not-found inside the shell, Go to Home and Search titles. AppShell titles unknown paths "Page not found" and backs them to Home; /titles/* and /migration-verification keep "Title details" and /library.
- Title detail: missing title shows a heading, one line and Search titles / Go to Home. The catalog-vs-synced note is one plain line plus a "How this is counted" Collapsible that still names both totals and which drives bulk actions (ui-contract rule kept). "N indexed" removed. `.empty a` narrowed to `.empty p a` so Button links keep their own colors.
- Insights: tile "Titles, 30 days"; Recently watched panel shows "Last 30 days" (the hidden eyebrow stays hidden).
- Home: Watch List shelf shows poster-shaped skeletons while loading and an error with Retry; "Save a title" only when truly empty.
- Checks: typecheck clean, all 32 specs pass. Staged preview review via floot-visual-qa preview-smoke journey marquee-audit (branch audit/marquee-20261012): runs 38277962050 phone, 38278313363 desktop, 38278592683 iPad portrait, digests verified, PNGs inspected.
