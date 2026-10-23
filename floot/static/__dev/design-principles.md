# Marquee Grid: design principles (rewritten October 22, 2026)

Grid replaced Premiere (aubergine/peach) on October 15, 2026, with Dave's approval; Premiere and the earlier neon identity are history. The October 22 design review consolidated the system below. Canvas: "Marquee design review" (Claude artifact, private). GameDeck stays independent.

## Visual brief
A night screening room seen from the grid floor: night ground with a deep-blue top glow, a faint perspective grid at the bottom (AppShell backdrop), complete posters, Archivo throughout. Hierarchy comes from artwork, type and space. One glass hero tile per page; everything else sits on the backdrop under a hairline.

## Tokens (base.css is the only owner)
| Role | Token | Dark | Light |
| --- | --- | --- | --- |
| Ground | --background | #070a12 | #eef2f7 |
| Surface | --surface / --card | #0b1726 | #e2e9f1 / #ffffff |
| Text | --foreground | #eaf6ff | #0b1320 |
| Secondary text | --muted-foreground | #8fa6bb | #4a5a6b |
| Action, focus, progress | --primary | #48e5ff (cyan) | #0a7a96 |
| Brand (mark, Watched pill) | --brand | #ff3448 | #e0263a |
| Charts only | --chart-color-1..5 | cyan, red, amber, violet, green | deeper variants |
| Divider | --border / --glass-hairline | #1d3550 / cyan 12% | #c5d1dd / teal 12% |
| Glass tile | --glass-bg, --glass-border | card 72%, cyan 16% | same mix |

Color rule: cyan means "you can press this or it shows progress"; red means Marquee itself; amber appears only in charts and ratings. Nothing else gets a color.

Radii: --radius-tile 20px (glass tiles, groups, cards, state blocks), --radius-poster 10px (every poster), --radius-control 12px (buttons, inputs, notices); pills 999px.
Type: Archivo only. Display 30px (24 to 26 phone), section 20px/700, body 15px, meta 13px. Floor 12px. Sentence case everywhere: no uppercase labels, no monospace.
Spacing: --spacing-1..8 (4/8/12/16/24/32). Touch target 44px minimum.
Artwork: complete 2:3 posters. Home feature 156px (132px phone, 116px phone card), shelves 144px, rows 44 to 48px; grid posters fill their column. Missing art keeps the frame and shows the title's first letter.

## Shared patterns
- Section header: hairline on top, 20px title, optional count (13px muted) and link (13px cyan), 44px row. Used on Home, Watch List groups, Insights, title details.
- Segmented control: 4px inset on --surface, 14px outer radius, 10px buttons, active = --glass-control-on with cyan text. Used by Activity/Titles, Insights period, Mapping review.
- StateBlock (components/StateBlock.tsx): one shell for empty (dashed) and error (red outline, always Retry when the caller can retry).
- Title row: 44 to 48px poster, title 15px/600, meta 13px, 4 to 6px progress on --muted.
- Settings and Sync: glass groups with icon tiles and sentence-case group labels.

## Structure
AppShell owns the backdrop, sticky header, phone page stack, floating dock with detached Search, and the collapsible desktop sidebar from 900px. Home: sync chip, Up next tile, then Keep watching (rows for 1 to 2 series, poster strip for 3+), Coming up, Recent activity, Watch List shelf; Customize Home order saved per device. Title details: phone backdrop fades behind a centered poster; from 700px the backdrop runs edge to edge behind poster and title. Insights: period switch, one hero tile (headline count, completed, avg rating, tappable month bars), then open sections with poster rows.

## Behavior and verification
static/__dev/ui-contract.md owns workflow requirements. Do not change authentication, data architecture, endpoint shapes, source matching, ingestion, sync jobs or historical records. Never invent dates, counts or activity. Before publishing: clean typecheck, relevant specs, staged visual QA at phone 440, intermediate and desktop sizes (dark and light), a coherent checkpoint, then Dave's explicit approval. The iPhone app ships through the Marquee-Floot mirror PR.
