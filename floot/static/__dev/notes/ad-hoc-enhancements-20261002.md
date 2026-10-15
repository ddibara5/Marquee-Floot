# Ad hoc enhancements — October 2, 2026

Authorized by Dave after closing and archiving the migration. Enhancements are staged in previews; no publish or native build was requested or performed. Published apps remain available on their existing releases.

Review record: https://chatgpt.com/space/page_044b902129bc819183eab6e43fa8e120
Archived migration: https://chatgpt.com/space/page_dc47939d2d44819188dae206b4ee668d

## Shared changes
Compact source rows show last success, next scheduled update and state, with Sync now and secondary diagnostics. Calendar Insights fill zero months across the true 3/12/all calendar range in America/New_York. Selected period totals and measured-platform rankings use that range; last-30-day and lifetime panels retain explicit labels. Local view/filter/sort preferences persist. Mapping review shows retained source evidence and exact canonical candidate choices, with persistent Ignore/Reopen.

## GameDeck
Reviewed open-ended IGDB identities and genre/keyword evidence replace fragile title-string exclusions. Native per-game preferences can disable, enable or restore catalog story estimation. Manual status, explicit completion dates and source completion retain precedence. Unmapped games queue returned 29 records, many Xbox media apps rather than games. IGDB search returned 18 Destiny candidates. Manual matches remain in the existing catalog-match table; ignores are checked at IGDB job selection and again at commit. Play events and accumulated totals are not rewritten.

## Marquee
Home Mark watched returns the exact new eventId for existing manual-only Undo; optional response field preserves client compatibility. Earlier completion uses the existing markEarlier action and never invents a watch date. Watch List has released/upcoming/date-unknown filters, a compact single toolbar and native Pick next intent promoted on Home. Last-30-day Most watched ranking now counts the same dated range as its panel. Six unresolved Crunchyroll identifiers are in review; special/recap reasons restrict matches to canonical specials and cannot map into numbered regular season progress. Ignores are honored by subsequent imports; Reopen restores only ignored unresolved evidence. Existing exclusions and changed-identity holds remain.

monitorSyncHealth is staged hourly at :45 UTC, reports stale/paused/blocked/stalled sources and unresolved source records into a native health preference and backend logs. It becomes scheduled after publishing; no external messages are sent or scheduled automations created.

## Data and recovery
Created additive public.gamedeck_enhancement_preferences and public.marquee_enhancement_preferences(user_id,item_key,value,updated_at). Existing Auth, history, statuses, ratings and canonical tables are preserved. New endpoints enforce the signed-in owner; GameDeck writes use same-origin and native-owner transaction admission. Existing writer fences remain. All old migration snapshots and receipts remain historical and unchanged. The immutable 35/42-table old backup manifests do not include these new preferences. Export/protect them separately and include them in a fresh scoped recovery plan before future recovery. Code checkpoints restore code/config only, not DB rows or published releases.

## Verification and limits
Both full typechecks clean. GameDeck calendar/schedule/health and GameData tests passed. Marquee calendar/schedule/health, Crunchyroll auto-match, import-policy and progress-summary tests passed. Existing GD pagination fixture corrected for the accepted native POST options contract instead of a legacy REST URL.
Signed-in reads: mapping review and preferences, GD IGDB search, GD source controls, MQ Home and sync-health returned 200. Live DOM review covered Insights, Home, sync, review and Watch List; no horizontal overflow found at the connected 739px view. Watch List Grid/List changed the stored view and was restored to List.
No historical watch/play event or manual status/rating was changed to manufacture acceptance evidence.
Full phone/desktop screenshot capture failed after retries (backgrounded/disconnected tabs); visual acceptance and live check-in/Undo, estimate-save, mapping-save/ignore/reopen and Pick next write acceptance remain pending. The monitor's first unattended cycle also remains pending publication.
Do not publish until Dave reviews previews and requests release. No new migration workflow is active.

## Follow-up: compact estimates and resumed Crunchyroll playback
GameDeck's estimate selector moved out of the status/rating grid into a 44px menu on the Your progress heading. It shows Auto/On/Off and retains the same native preference, radio options and error handling. Live DOM confirms one 44px heading row, no overflow, and all three menu options with the current preference checked.

Crunchyroll records show Mirror (G50UMN4Z1, canonical 207) partial September 27, completed September 28; A Ghost Story (GWDU7MDZV, canonical 213) partial September 29, completed September 30. Date changes were incorrectly held as identity changes. The provider also renumbered Apothecary Diaries S2 identifiers from absolute to season-relative episode numbers. Importer now compares stable panel ID, series and parent; identifier renumbering additionally requires the exact episode title and episode number. Real identity conflicts remain held. Existing observation payload, completion flag and playback date now refresh on conflict; completion/date insert keys remain idempotent. Kysely's nested JSON camel-casing is avoided by reading provider payload as text and parsing its original contract.

Successful rollback replay 4ebd2947-e100-4977-b83f-de1d936d8790 of approved live run b36e5409-9e05-49da-ab0d-ef6c506fc69e: 380 fetched, 222 mapped, 155 held, 3 partial, two recovered completions, zero new dated events, canonicalCommitted=false. Four existing season-renumbered completions also resolve from changed to mapped. Both targeted episodes still uncompleted in native rows after rollback, confirming no watch-history commit. On release the next native collector sync can repair them; old recovered completions remain undated under the existing 48h source-date rule. New next-night partial-to-full transitions may be dated when recent and collector-established. Fox Village is a separate title-matching review item (provider Fox Village vs catalog The Fox Village), deliberately still unresolved.

Regression specs: three Marquee spec files passed; both full typechecks clean. iPhone screenshot capture remains pending/subject to connected foreground preview availability. No publish, manual-state alteration, or production repair performed.

## Follow-up: interactive media cards
October 2 screenshot review requested clickable status badges in both apps, rating/list icons in the top card, and a Marquee-style faded artwork background in GameDeck. Separate detail control panels and duplicate passive status/rating/list indicators removed. Menu choices remain seeded Radix radio menus, with accessible labels, visible chevrons/focus, busy/error handling and 44px minimum targets. GameDeck retains all five explicit status choices plus Use calculated status; Marquee retains Paused/Dropped plus Use calculated status. Existing save/clear/rating/list/Undo handlers remain. Estimate menu stays beside Your progress.

Phone CSS places the controls across the card below poster/title rather than squeezing them beside the poster. Desktop controls sit below metadata. GameDeck uses the existing cached first catalog screenshot as a softly washed backdrop, with current cover fallback, theme-token scrims, no new catalog request and non-interactive decorative imagery. Missing/failed art keeps a readable plain card.

Both typechecks clean. Live desktop DOM confirms 44px status/rating/bookmark targets and no horizontal overflow; both status radio menus match existing semantics. Marquee rating menu verified all eleven choices. Screenshot jobs failed three attempts per app due 15-second capture timeouts; actual iPhone/desktop visual acceptance remains pending. No statuses, ratings or lists changed for testing; no publication. Studio learning ledger and Supermemory record this as a candidate shared pattern pending review.

## Follow-up: artwork layer fix and matched Home progress
Dave's October 2 screenshots showed the GameDeck detail scrim faded foreground content. Live computed CSS confirmed the pseudo-element had z-index:auto. Fix uses explicit nonnegative layers: artwork and scrim at 0, cover/text/control children at 1, including display:contents children on phones. Live computed styles confirm scrim0, cover/text1, opacity1 for content. Artwork opacity .5 with theme scrim keeps background subtle. Earlier negative-layer design superseded.

Home feature cards now share padding16, gap15, radius16, covers94x125 on phone /110x147 desktop /76x102 narrow320, common44px footer action row and six-pixel progress track. Marquee quick check-in/options share the footer row with View next episode instead of stacking below it. Meaningful title remains up to two lines; metadata one line. No fixed height on text or loss of controls at wrapping/font scaling.

GameDeck progress is estimatedStoryProgress when eligible and a finite story length exists; otherwise finite achievement percent, explicitly labeled Achievements; missing data shows unavailable rather than a fabricated zero. Marquee uses existing getTitleProgressSummary canonical unique watched/released series episodes. Released scope is explicit: currently43/48,90%; does not imply a returning series is permanently complete. No new source requests, backend contracts, schedules, writes, or date/status changes. Progress component forwards its value to Radix in both apps for screen-reader numeric semantics (GameDeck already did; Marquee needed the correction).

Both typechecks and existing GameData/getTitleProgressSummary specs passed. Actual MQ desktop card232.8px with 90% numeric aria state, no overflow. GD detail foreground layers verified. Subsequent GD Home browser session was signed out, so live GD Home sizing and phone visual acceptance remain pending; same CSS geometry checked in code. Previous screenshot capture jobs timed out; not retried without a changed capture condition. Unpublished.


## Previous-page Back and compact Home tiles — October 2 follow-up

Back now tracks React Router location keys and PUSH/POP/REPLACE transitions per app tab, because the Floot preview can lack browser history.state.idx. Header Back, edge swipe, and existing Escape navigation use the same hook. Real prior routes (including query filters and nested settings) take priority; direct entry retains a safe fallback. No persistent or cross-tab trail is inherited.

Home actions moved inside the text column next to the artwork. Artwork stretches to the full content height; shared tighter padding, spacing, and typography retain 44px action targets and progress bars. Marquee desktop measured 179.6px for the tile and 149.8px for artwork, versus 232.8px before this pass. GameDeck progress normalizes finite native numeric strings: a native percent of "10.00" now displays 10% Achievements, while missing/invalid progress stays unavailable.

Both full typechecks pass. Both pure navigation suites and React Router integration suites pass: Home and filtered search to detail and Back, nested settings, and safe direct-entry fallback. GameDeck numeric progress tests pass. Live navigation acceptance remains pending: synthetic link clicks did not change routes, and subsequent connected-browser checks timed out with no foreground tab. Phone visual acceptance remains pending. No production publish or personal-history test mutations.
