# Marquee-Floot

iOS builds of the Marquee Floot app through Codemagic, without using Floot's monthly app builds.
Floot stays the backend: the app calls `https://marquee-ddibara.floot.app/_api/...` over HTTPS.

```
floot/          Floot code export (Get Code > Download as ZIP), unchanged
native/         native-shim.js: sends relative /_api calls to the live Floot app
scripts/        build-web.sh: builds floot/ into floot/dist for the iOS shell
ios/            Capacitor 8 iOS project (Swift Package Manager, no CocoaPods)
codemagic.yaml  Build, sign, upload to TestFlight (internal testers); starts on pushes that change floot/ or the shell
```

## Release a new build

1. Floot: open Marquee, project menu > **Get Code** > **Download as ZIP**.
2. GitHub: upload the ZIP to the repo root as `Marquee.zip` and commit (the build unpacks it into `floot/`).
   Or hand the ZIP to Claude, who replaces `floot/` and pushes.
3. The push starts the Codemagic build (workflow **Marquee iOS to TestFlight**). Manual start also works: **Start new build**.
4. iPhone: install the new build from TestFlight (about 10 to 20 minutes after the build finishes).

Native plugin versions in `package.json` must match the ones in `floot/package.json`.
