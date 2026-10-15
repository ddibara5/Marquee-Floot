# Authentication MVP — October 2, 2026

Status: published October 2, 2026 with explicit authorization, including earlier queued ad hoc enhancements. Both publish jobs succeeded; live recovery pages, empty-email validation/focus and Back to sign in navigation verified. GameDeck's published sign-in screen renders. Marquee's existing signed-in session continues to show real Home/watch data after deployment. Password-first pilot for GameDeck and Marquee. No owner password has been installed, reset, rotated or documented. No shared password or credential appears in these notes. Dave accepts secure password-entry handoffs and will choose the same simple passphrase (6+ characters) in each pilot, test recovery/sign-in, then extend the pattern. Automatic Floot login is deferred.

## Implemented
- Consistent branded sign-in, forgot-password and reset-password screens, using existing components/theme tokens; no rebrand or new token system.
- Password fields masked by default with Show/Hide, username/current-password/new-password autofill, application validation, recovery correction errors and busy states.
- Recovery for the existing owner only. No account enrolment, role, identity map, household membership, database schema or provider binding change.
- Fifteen-minute, app-specific recovery links bound to the owner's current password hash. Password change invalidates outstanding links; transactional compare-and-update prevents successful replay. Successful reset revokes that app's owner sessions and clears failed normal login attempts.
- Neutral unknown-email response, shared recovery request throttling, same-origin request enforcement, no-store responses. Link token in fragment, stripped from browser URL.
- Seven-day session JWT lifetime aligned with existing seven-day host-only secure cookie and database expiry.

## Verification and limits
- Twelve focused assertions per app passed: recovery token ownership/app/hash/expiry/tampering, action contracts, password length/bcrypt byte bound, and session/cookie lifetime/clearing.
- Runtime negative checks passed in both staged backends: missing/foreign Origin rejected, incomplete/invalid reset rejected, unknown nonowner email receives neutral success. One recovery audit attempt row was written in each app by the neutral request check; no account/session/password change.
- Actual published Marquee owner sign-in via secure browserAuth handoff succeeded. Codex independently viewed real Home/watch data and Account, then opened a fresh signed-in tab without another prompt. This proves signed-in visuals and same-browser tab reuse, not unattended password entry, >24-hour persistence or a new Work task.
- Saved proof: marquee-signed-in-proof-1790977887176.jpg; staged iPhone recovery layout marquee-recovery-preview-1790979925165.jpg; published recovery gamedeck-live-recovery-1790980468763.jpg and sign-in gamedeck-live-sign-in-1790980504175.jpg. Both published recovery forms show Invalid email and focus Email on empty submit; this resolves the earlier view-only preview interaction limit. Actual email delivery and successful reset remain for Dave's next test.
- Scoped strict UI audit: Marquee zero findings. GameDeck one static false positive on canonical Button asChild wrapping React Router Link to /forgot-password; a real navigation action exists. Scope snapshots are not a full-app audit.
- Real recovery email delivery, successful reset, new/old password login, session revocation, concurrent token consumption and disposable-password/rotation sequence remain unproved. Email sender delivery needs confirmation against Floot owner/verified-sender rules.
- The cloud browser requires secure user credential handoff and forbids model-entered sign-in values. Writing a password in documentation does not enable unattended reauthentication.

## Rollout contract
GameDeck and Marquee are pilots only. current. and Cookbook are unchanged; preserve their existing ownership rules, fix server-side registration/expiry gaps before rollout. Jet Money is unchanged, keeps a unique password and separate recovery, and requires reading its active plan before changes. Matching passwords do not create one shared identity or synchronize reset. No cross-app reset coordinator implemented yet; it must explicitly list nonfinancial apps, report per-app partial failures and exclude Jet Money.

## Release and next proof
Create a named code checkpoint and require explicit publication request under Studio static/__dev/notes/development-playbook.md: "Do not publish unless the user explicitly requests publishing."
Publishing either pilot includes the existing unpublished ad hoc enhancements; review static/__dev/notes/ad-hoc-enhancements-20261002.md.
Next: Dave tests recovery delivery and reset in each pilot, then we verify old session/login rejection and new login before rollout. Open the published /forgot-password page, enter ddibara@gmail.com, request the app-specific email, follow its link within fifteen minutes, choose/confirm a simple passphrase of at least six characters, and repeat with the identical passphrase in the other app. Resets are per app and sign out that app's existing sessions; Jet Money is excluded. Do not paste password or reset links into chat. After both are reset, use secure browserAuth handoffs to sign Codex's browser into each for independent signed-in visual checks. Dave accepts those handoffs for now; automatic Floot login is deferred. Keep documentation limited to the login convention and process; no password value in source, notes or memory.



## Recovery delivery repair — October 2, 18:40–18:50 EDT
Earlier requests failed with EmailDomainNotShared after incorrectly using the owner Gmail as From. The temporary decision to require a custom verified domain was premature and is superseded. Floot's official https://floot.com/docs/integrations/email confirms unverified senders are rewritten to its shared platform domain and delivered only to the project owner. Dave owns no website domain and requested verification of that path. Each app now uses its actual published hostname as the requested sender, explicitly unverified, with Floot's documented owner-only rewrite; no domain purchase, DNS setup or ownership-check bypass. Both staged owner recovery requests returned 200 and server logs recorded Recovery email accepted with provider message IDs (Marquee 22:57:03 UTC, GameDeck 22:57:54 UTC). One real recovery email from each pilot was requested; links point to the existing live reset page and expire after fifteen minutes. Provider acceptance is proved; inbox delivery and successful password reset still require Dave's confirmation. Failure responses and throttling remain. No password or owner session changed.

User accepts six-character passwords in both nonfinancial pilots; backend schema, new/confirm input minimum and guidance now use six, and tests accept six/reject five while retaining the 72-byte bcrypt maximum. Marquee Create account UI removed; backend registration was not modified. GameDeck sign-out exists in Settings > Account & device and Dave reported successfully signing out, so no sign-out implementation changes were made.

## Canonical UI and interaction contract
Reuse FamilyAuthShell, PasswordField and PasswordRecoveryForm across this app's auth routes; existing base.css and primitives remain canonical. Studio design/QA notes are the maintained family reference. No schema, font or theme migration. Keyboard labels/error associations and password masking implemented; phone/desktop, keyboard, failure and recovery checks must be completed with the deployed flow. Keep credentials out of source, logs, screenshots and release notes.

App: Marquee

Final full typecheck clean; 3 relevant spec files passed, 0 failed (recovery token, session lifetime, migration admission).


## Owner confirmation and wider rollout
Dave confirmed both GameDeck and Marquee recovery emails arrived and both password resets worked; he chose the same new password. This supersedes earlier inbox/reset-pending statements. Codex has not independently reauthenticated after these resets. current., Cookbook and Jet Money recovery are being prepared separately. Canonical credential-free signed-in review/recovery workflow is in Studio static/__dev/notes/signed-in-visual-review.md; signed-in staged visual checks precede publication. Browser secure handoff is accepted; unattended automatic login remains deferred.
