#!/usr/bin/env bash
# Applies patches/*.patch to node_modules after npm ci. A patch that no longer applies (for example after a
# plugin version bump) fails the build, so the fix gets reviewed instead of silently dropped.
set -euo pipefail
cd "$(dirname "$0")/.."
for p in patches/*.patch; do
  echo "Applying $p"
  patch -p1 -N -F 0 < "$p"
done
