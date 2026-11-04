#!/usr/bin/env sh
set -e
find src scripts bin -name '*.mjs' -o -name '*.js' | while read -r f; do
  node --check "$f"
done
echo "syntax ok"
