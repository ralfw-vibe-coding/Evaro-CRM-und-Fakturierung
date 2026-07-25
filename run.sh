#!/usr/bin/env bash
# Startet die App lokal (Frontend + Netlify-Functions-Backend über netlify dev).
#
# Nutzung:
#   ./run.sh              startet mit der Persistenz aus .env (Standard: Postgres/Neon)
#   ./run.sh memory       erzwingt In-Memory-Persistenz (kein DATABASE_URL nötig)
#   ./run.sh postgres      erzwingt Postgres/Neon-Persistenz
#
# Wichtig: startet IMMER über "npm run dev" (lokale netlify-cli), nie das
# global installierte "netlify" — siehe [[toolchain-node-arch]]: auf diesem
# Mac muss netlify unter arm64-node laufen, sonst schlagen native Module
# (rollup, esbuild) fehl.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -d node_modules ]; then
  echo "→ node_modules fehlt, installiere Abhängigkeiten..."
  npm install
fi

case "${1:-}" in
  memory)
    echo "→ Starte mit In-Memory-Persistenz (http://localhost:8888)"
    exec npm run dev:memory
    ;;
  postgres)
    echo "→ Starte mit Postgres-Persistenz (http://localhost:8888)"
    exec npm run dev:postgres
    ;;
  "")
    echo "→ Starte mit Persistenz aus .env (http://localhost:8888)"
    exec npm run dev
    ;;
  *)
    echo "Unbekannte Option: $1" >&2
    echo "Nutzung: ./run.sh [memory|postgres]" >&2
    exit 1
    ;;
esac
