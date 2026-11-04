#!/usr/bin/env sh
set -e

PORT="${PORT:-3000}" npm start &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

started=""
for _ in $(seq 1 30); do
  if curl -fs "http://localhost:${PORT:-3000}/healthz" >/dev/null 2>&1; then
    started=1
    break
  fi
  sleep 1
done

if [ -z "$started" ]; then
  echo "server did not start on :${PORT:-3000}" >&2
  exit 1
fi

npm test
