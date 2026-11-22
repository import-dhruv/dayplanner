# Dayplanner

A personal day planner and productivity command center. Next.js + TypeScript + Tailwind on the front, FastAPI + SQLAlchemy + PostgreSQL on the back.

**Live:** https://dayplanner-opal.vercel.app — demo login: `dhruv@planner.local` / `password123`

## Features

- **My Day** — greeting, live clock, daily overview, three selectable priorities, grouped task list (Morning / Afternoon / Evening / Anytime) with drag-to-reorder and reschedule, interactive timeline with a live current-time marker, unscheduled task tray, and an evening review.
- **Tasks** — full CRUD, rich descriptions, subtasks and checklists, tags, priorities, statuses, dates, durations, recurrence, reminders, dependencies, time tracking, list/board views, grouping and filtering.
- **Calendar** — day / week / month / agenda views, click-to-create, drag-to-move, resize-to-change-duration, overlapping-event layout, colors, categories, recurrence. Scheduled tasks appear as calendar blocks and moving them updates the task.
- **Kanban** — dnd-kit drag-and-drop between Todo / In Progress / In Review / Done, custom columns, category/priority/due/subtask cards.
- **Projects** — dedicated workspaces with progress, deadlines, notes and linked tasks.
- **Notes** — rich-text editor, folders, tags, pinning, search, links to tasks and projects.
- **Analytics** — daily/weekly/monthly completion, time by category, productive weekdays, project progress.
- **Search & shortcuts** — global command palette, `N`, `C`, `T`, `/`, `Esc`, `⌘/Ctrl+K`.
- **Light / dark mode**, responsive layouts, onboarding, JSON backup/restore, demo seed data.

## Run locally

### 1. Database
A local PostgreSQL instance is expected at `127.0.0.1:55433` with user `planner` and database `dayplanner` by default. To start one yourself:

```bash
/usr/lib/postgresql/18/bin/initdb -D ./pgdata -U planner --auth=trust
/usr/lib/postgresql/18/bin/pg_ctl -D ./pgdata -o "-p 55433 -h 127.0.0.1" -l ./pg.log start
/usr/lib/postgresql/18/bin/createdb -h 127.0.0.1 -p 55433 -U planner dayplanner
```

Or just use Docker (see below).

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8765
```

Tables are created on startup; Alembic migrations live in `backend/migrations`.

### 3. Frontend

```bash
npm install
npm run dev       # http://localhost:3000
```

The Next.js dev server proxies `/api/*` to `http://127.0.0.1:8765`.

### Docker

```bash
docker compose up --build
```

App: http://localhost:3000 · API: http://localhost:8765

### Vercel

The production deployment uses a single Vercel project with two **Services**:

- `frontend` (root `.`) — Next.js
- `backend` (root `backend/`) — FastAPI, entrypoint `app.main:app`

`vercel.json` rewrites `/api/*` to the backend service, so the browser only talks to one origin. The database is a Neon Postgres instance provisioned through the Vercel Marketplace and injected as `DATABASE_URL`; `SECRET_KEY` is stored as a Vercel environment variable. Every push to `main` deploys automatically.

## First launch

Sign in with the demo account (`dhruv@planner.local` / `password123`), or create your own account. Onboarding lets you choose a theme, week start and working hours, and optionally load an editable demo workspace.

## API

Interactive docs at `http://127.0.0.1:8765/docs`. All endpoints are under `/api`, use camelCase JSON, and require `Authorization: Bearer <token>` except register/login. `GET /api/bootstrap` returns the complete workspace in one request; individual CRUD endpoints are also provided for every entity.

## Notes

- Dates are stored as `DATE`; instants are stored as UTC `TIMESTAMPTZ` and converted to browser-local time.
- Recurring tasks spawn their next occurrence when the current one is completed.
- Backups are plain JSON and can be restored from Settings.
