# Home redesign and desktop sidebar — October 12, 2026

**Published** October 12, 2026 at about 4:07 PM Eastern on Dave's "publish" (web only, job e0107f62-8be5-4124-a90a-a9bef0980b0a, live at https://marquee-ddibara.floot.app). Production checks passed with digests verified: desktop 38302140550, iPad portrait 38302393023, phone 38302670787 (0 small targets, 0 tiny text, 0 page errors; only the long-standing "detail counted" skip).

Dave approved the Home mockups ("build them all") on the canvas Marquee Home concepts (https://claude.ai/artifact/SnNSAqkrKVqFfut5w2CLpx). Not published.

## What changed
- Sync line above Up next: latest Trakt / Crunchyroll success, per-source times from 760px, "Sync needs a look" past 30 hours, link to Data & sync.
- Up next: backdrop shown whole (contain) on top on phone, beside the copy from 900px; "Watched today/yesterday/<day>"; runtime and a 3-line synopsis from the next episode; "3 of 8 watched · 5 left"; one Next episode button. Still no Mark watched on Home.
- New Last 7 days card (Eastern days, distinct episodes plus movie watches), Coming up (first upcoming episode per started show within 60 days, plus dated Watch List releases within 120 days, four max), Keep watching (former Continue watching and New episodes, with "N episodes ready" and a progress bar).
- Recent activity skips titles shown above, names the last episode when it matches the title's last watched day, and shows Caught up / Complete as a word badge only when no released episode is unwatched (synced totals can trail the catalog).
- Watch List shelf: three across on phone, six from 760px; dated releases show their date.
- Customize Home sheet (bottom on phone, right on wider): arrows plus switches, Reset, saved per device in localStorage key marquee-home-layout (helpers/homeLayout.tsx). Up next always first.
- Sheet close is labeled and 44px (only Home uses Sheet).

## Desktop sidebar (Dave, 3:28 PM: "a collapsible sidebar similar to my other app style instead of a bar across the top")
From 900px (family desktop breakpoint) AppShell shows a Cookbook-pattern sidebar in Premiere colors: brand, Home / Activity / Watch List / Insights, then Search titles and Settings at the bottom. The chevron collapses it to icons (72px); the choice is saved per device in localStorage `marquee-sidebar-collapsed`. The header keeps Refresh, the page title and Search. Below 900px (phones, iPad portrait) the floating bottom bar is used, replacing the 760-899px top bar. This supersedes the October 3 horizontal desktop nav in ui-contract.md. Home Up next goes three across from 1180px so the copy keeps room beside the sidebar. Preview runs: desktop 38299206051, iPad landscape 38298528943, iPad portrait 38298839183 (digests verified).

## Backdrop cap (Dave, 3:50 PM)
The stacked Up next backdrop is capped at 240px tall (it was about 410px on iPad portrait). The art stays whole (contain) and centered; a blurred, faded copy of the same backdrop fills the sides. Phones fit under the cap, so they still show it edge to edge. Preview runs: iPad portrait 38301032579, phone 38301330026 (digests verified; Home 170px shorter on iPad).

## Logo (Dave, 4:31 PM: "Lets go with your recommendations"; then chose to apply in preview)
Approved mark: A4 upright ticket, notched top and bottom, M cut through, peach on aubergine (canvas boards "Logo, three directions" and "Logo, ticket shapes and colors"). App icon asset `/_cdn/static/71ebcbb9-5db2-493a-9825-c003ab9a9924-marquee-icon-a4.png` (1024px, full bleed) is now the project iconUrl; it reaches the live favicon and home-screen icon at the next publish and the native icon only with a mobile build (not authorized). `components/MarqueeMark.tsx` draws the mark in currentColor (peach dark, brown light) in the sidebar and phone header. Manifest colors moved from the old neon (#080b12 / #00e6c7) to aubergine #1d171e. Preview runs: desktop 38305380452, narrow 38305743264 (digests verified). **Published** about 4:46 PM Eastern on Dave's "Publish" (web only, job f7b99401-bcd9-413b-b8cb-c0b1260a0ff6); the live page's icon and apple-touch-icon links point to the new asset. Production checks passed: desktop 38306311988, phone 38306562598. The installed native app keeps the old icon until a mobile build.

## API
home-context_GET adds optional fields only: NextEpisode.overview, runtimeMinutes, readyCount; week, upcoming, lastEpisodes. Existing fields and shapes unchanged for the native app.

## Validation
Typecheck clean; homeLayout spec added; all specs pass (interactionRegression alone, as before). Preview runs with digests verified (runner branch runner/marquee-home-20261012 adds home-middle, home-end and home-customize captures): phone 38294908130, desktop 38296466700, narrow 38296806340, iPad portrait 38294327052. No overflow, no small targets, no tiny text, no page errors. Pre-existing preview skips (detail counted, titles filters, watch list row menu) unchanged.
