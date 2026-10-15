#!/usr/bin/env bash
# Builds the Floot export in floot/ into floot/dist for the iOS shell.
set -euo pipefail
cd "$(dirname "$0")/.."

# A fresh Floot export can be dropped in the repo root as Marquee.zip.
if [ -f Marquee.zip ]; then
  echo "Unpacking Marquee.zip into floot/"
  rm -rf floot && mkdir floot && unzip -q Marquee.zip -d floot
  rm -f floot/env.json
fi

cd floot
npx -y pnpm@10.34.7 install --reporter=silent
npx -y pnpm@10.34.7 vite build

# Native-only additions: edge-to-edge viewport and the /_api rewrite (loaded before the app).
cp ../native/native-shim.js dist/native-shim.js
sed -i.bak 's#width=device-width, initial-scale=1.0#width=device-width, initial-scale=1.0, viewport-fit=cover#; s#</title>#</title><script src="/native-shim.js"></script>#' dist/index.html
rm dist/index.html.bak
grep -q native-shim.js dist/index.html && grep -q viewport-fit=cover dist/index.html

# The app icon is served from Floot's CDN path; bundle it so it loads offline.
ICON=_cdn/static/71ebcbb9-5db2-493a-9825-c003ab9a9924-marquee-icon-a4.png
mkdir -p "dist/$(dirname "$ICON")"
curl -fsSL "https://marquee-ddibara.floot.app/$ICON" -o "dist/$ICON"
