# Marquee-Floot

iOS builds of the Marquee Floot app through Codemagic, without using Floot's monthly app builds.
Floot stays the backend: the app calls `https://marquee-ddibara.floot.app/_api/...` over HTTPS.

```
floot/          Floot code export (Get Code > Download as ZIP), unchanged
native/         native-shim.js: sends relative /_api calls to the live Floot app
scripts/        build-web.sh: builds floot/ into floot/dist for the iOS shell
tools/          floot-drift.py: Floot vs floot/ drift check (outside the Codemagic changeset, so it never starts a build)
ios/            Capacitor 8 iOS project (Swift Package Manager, no CocoaPods)
codemagic.yaml  Build, sign, upload to TestFlight (internal testers); starts on pushes that change floot/ or the shell
```

## Release a new build

`floot/` must match the Floot project exactly; a missed edit ships a stale build. Codemagic builds only on pushes to
`main`, so every release goes through a mirror PR:

1. Save Floot's `list_files` output (with its `version:` and `dependencies:` lines) and `read_files` results covering
   every listed file plus `static/__dev/history.md` (batches of about 60k characters are saved to disk whole; pass
   `limit: 5000` for files over 1,000 lines). The history tells the check whether the web is published at this
   version; unpublished work fails the check unless you pass `--allow-unpublished`, because the iOS app calls the
   live web backend.
2. On a new non-trigger branch run `python3 tools/floot-drift.py --listing <listing> --dumps <dir>`. Exit 0 means no
   real difference; exit 1 lists added, changed and removed files plus wiring to check; exit 2 means the dumps are
   incomplete. Add `--write` to refresh `floot/` from Floot (it keeps the base.css platform block and never touches
   `App.tsx` or the other shell files), then run it again until it reports 0.
3. If it flags a missing route, add the page to `floot/App.tsx` by hand. If it flags a native plugin, pin it in the
   root `package.json`, run `npm ci && npx cap sync ios`, and commit `ios/` changes.
4. `npm run build:web`, then open a PR into `main` with the drift report in the description.
5. Merging the PR (owner's approval) is the only thing that starts the Codemagic build (workflow **Marquee iOS to TestFlight**).
6. iPhone: install the new build from TestFlight (about 10 to 20 minutes after the build finishes).

Native plugin versions in `package.json` must match the ones in `floot/package.json` (the drift check verifies this).
`python3 tools/floot-drift.py --self-test` checks the parser and the base.css rule.
