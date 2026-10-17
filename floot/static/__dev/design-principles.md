# Marquee Premiere — approved October 3, 2026

Dave approved the refined interactive Premiere mockup for implementation. Authenticated staged review is recorded in ui-contract.md; Dave approved the staged preview and publication; Premiere was published October 3, 2026 at https://marquee-ddibara.floot.app. This supersedes the neon cinema identity; GameDeck remains independent and unchanged.

## Visual brief
A quiet cinematic screening room: aubergine surfaces, warm peach actions, complete film/TV/anime posters and Archivo throughout. Establish hierarchy through artwork, typography and space. Avoid neon glow, technical grids, ornamental rails and repeated eyebrow/section labels.

Use complete 2:3 foreground posters with object-fit:contain and fixed aspect-ratio frames, including missing/broken artwork fallback. Main posters: 156px; shelves: 144px; activity rows: 48px. Titles and Watch List grid posters fill their grid column (October 17, Dave approved Batch B); the fixed sizes apply to Home shelves, feature and detail posters. Phone main/shelf posters: 132px; Home at under 360px uses 108px inside the feature to preserve readable episode controls. Artwork does not stretch to match text height. Poster captions share the artwork's left edge; peer section headings/first content rows align.

## Tokens and ownership
Model B: base.css is the canonical runtime token owner. This document mirrors accepted values; seeded controls and CSS modules consume semantic variables, not a second palette. helpers/themeMode.tsx keeps existing System/Dark/Light preference behavior and dark default.

| Role | Runtime token | Premiere dark | Light interpretation |
| --- | --- | --- | --- |
| Canvas | --background | #1d171e | #f6f0ec |
| Surface/card | --surface / --card | #2a232c | #eee4df / #fffaf7 |
| Main text | --foreground | #fff4ee | #2a2029 |
| Secondary text | --muted-foreground | #c4b6c1 | #72616c |
| Action/focus/progress | --primary | #f0b88f | #875036 |
| Divider | --border | #51414f | #d6c6cd |
| Soft state | --secondary / --muted | #372d38 | #e8dcd6 |
| Display/body/UI labels | --font-family-display / --font-family-base / --font-family-monospace | Archivo, system-ui, sans-serif | Same |
| Spacing | --spacing-1/2/3/4/6/8 | 4/8/12/16/24/32px | Same |
| Typography | --text-display / --text-heading / --text-body | 32/18/14px; display 24px on phone | Same |
| Artwork | --poster-main / --poster-shelf / --compact-poster-width | 156/144/48px | Same |
| Touch target | --touch-target | 44px minimum | Same |

base.css also owns status/error/chart semantic colors, focus/scrollbar visibility and reduced motion. Muted status colors must retain accompanying text/labels. Keep body line-height 1.5; headings 1.2–1.3 and weight 600. Metadata 12px; no essential-content truncation to manufacture a fit.

## Responsive structure
AppShell.tsx owns horizontal desktop underline navigation at 760px and above, sticky header and floating phone root navigation. The former sidebar collapse setting no longer applies to this top-bar layout; all four destinations and Settings remain available. Back, refresh, search and restoration owners are retained.
Home uses a poster/text spotlight; phone title spans the card before poster/next-episode content. Recent activity and Watch List become equal desktop columns; Continue/New episode tiles are preserved when populated.
Details use a full-width title on phone, poster/next information row, full-width inline status/rating/bookmark row, synopsis and scoped progress. Desktop seasons and history share a heading baseline, with full-width synopsis/progress and catalog metadata below.
Titles become an aligned poster shelf. Activity keeps dated groups and Earlier watches. Watch List preserves list/grid/search/filter/sort/Pick next/Undo controls; grid captions align with complete posters. Insights uses a deliberate desktop panel grid with all existing metrics and dated periods intact.
Compact tabs and inline dropdowns keep 44px targets. Long titles and metadata grow/reflow in meaningful groups; content remains reachable above fixed navigation.

## Behavior and verification
static/__dev/ui-contract.md owns workflow requirements and capability owners. Do not change authentication, data architecture, endpoint shapes, source matching, ingestion, sync jobs/schedules or historical records. Never invent dates, counts or activity. Preserve tracking, ratings/clear, Watch List, search/Clear, filters, preferences, source provenance, known/unknown date semantics, episode/season actions, confirmations, Undo/error recovery, loading/empty states, keyboard/touch access and Back restoration of view/filter/query/scroll/focus.
Before publishing: clean Floot typecheck, relevant regression suites, authenticated staged root/detail/settings/state review on phone/intermediate/desktop, coherent checkpoint, then Dave's explicit preview/publication approval. Mockup screenshots or current production are not staged acceptance.
