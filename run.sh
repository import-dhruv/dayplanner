#!/usr/bin/env bash
# Starts the local PostgreSQL instance (if needed), the FastAPI backend, and the Next.js frontend.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PG_BIN=/usr/lib/postgresql/18/bin
PG_DATA="$ROOT/pgdata"
PG_PORT=55433

if ! pg_isready -q -h 127.0.0.1 -p "$PG_PORT" 2>/dev/null; then
  if [ ! -d "$PG_DATA" ]; then
    "$PG_BIN/initdb" -D "$PG_DATA" -U planner --auth=trust
  fi
  mkdir -p "$ROOT/pgrun"
  "$PG_BIN/pg_ctl" -D "$PG_DATA" -o "-p $PG_PORT -h 127.0.0.1 -k $ROOT/pgrun" -l "$ROOT/pg.log" start
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" -U planner dayplanner 2>/dev/null || true
fi

if ! curl -sf http://127.0.0.1:8765/api/health >/dev/null; then
  (cd "$ROOT/backend" && nohup ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8765 > "$ROOT/backend.log" 2>&1 &)
fi

echo "Dayplanner API: http://127.0.0.1:8765  (docs: /docs)"
echo "Dayplanner app: http://localhost:3000"
cd "$ROOT" && npm run dev
