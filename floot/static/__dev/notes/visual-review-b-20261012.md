# Visual review Batch B (Oct 12, 2026)

Dave: "Go, batch B". UI only; no endpoint, schema, data, sync or schedule change. Built straight in the preview (the preview served as the mockup).

- Title detail episodes: phone rows stay one line (status, number, title + air date, one action). Watched episodes put Log rewatch today, Move check-in to Earlier watches (when a manual check-in exists) and Mark unwatched in one "Episode actions" menu; unwatched keep the Mark watched menu. "undated" becomes "Watched, date unknown" in the row text. Phone detail page with one season open: 8,990px to 5,294px.
- Movie detail: no progress bar or duplicate status; runtime, release and last watched beside the poster. Log rewatch / Undo unchanged.
- Watch List: Pick next lives in the row menu (Set as / Clear Pick next) and a star badge marks the picked title. Grid cards: poster, title, one meta line pinned to the card bottom, menu beside the caption. Title links 44px.
- Titles shelf (TitleCard compact): meta right under the title, progress pinned to the card bottom, percent next to the count.
- Activity list left-aligned with its toolbar. Home Watch List shows three posters at 1100px and wider. Home heading links, filter chips and desktop nav links are 44px. Insights legend 12px.
- Not done: Activity per-day grouping (would change Back focus keys), season actions moved into a header menu (trigger is the accordion button), desktop metadata size bump (base token change; separate decision).
- Checks: typecheck clean; all 32 specs pass (interactionRegression is order-sensitive when batched after actionSafeguards; passes alone and in the default run). Preview runs 38281628428 phone, 38281927501 desktop, 38282169159 narrow 320, 38282459805 iPad portrait: passed, digests verified, no small targets or overflow measured, PNGs inspected.
