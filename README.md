# Team Task Board

A lightweight, multi-user project management tool — a trimmed-down Trello/Linear. Built to practice a Python/Postgres/Next.js stack after previously working in MERN, and to practice incremental, professional git workflows.

## Stack

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL, with Alembic migrations
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Auth:** JWT (stateless, bearer tokens)

## Features

- JWT-based signup/login/logout, with role-based access (Admin / Member)
- Projects with membership-based visibility — a Member only ever sees projects they've been explicitly added to, **enforced server-side**, not just hidden in the UI
- Kanban-style task board (To Do / In Progress / Done) with priority, due dates, and assignees
- Filtering by assignee and priority
- An audit-trail Activity Log per project, showing who did what and when
- In-app notifications when a task is assigned to you (unread badge + list)

## Getting started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start Postgres
cd ..
docker compose up -d

# Copy env template and fill in secrets
cd backend
cp .env.example .env

# Run migrations
alembic upgrade head

# Start the API
uvicorn main:app --reload
```

API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

App available at `http://localhost:3000`.

## Design decisions worth calling out

This project was built specifically to practice reasoning through architectural tradeoffs, not just writing CRUD. A few decisions are documented here because they were deliberate choices among real alternatives, not defaults.

### Access control is enforced by a shared dependency, not per-route checks

Every project-scoped endpoint (tasks, members, activity log) takes a `get_project_member` FastAPI dependency as a parameter. It checks whether the current user has a membership row for the requested project and raises `403` if not — **before** the route's own logic runs.

This was a deliberate structural choice: rather than remembering to add a membership check inside every new endpoint by hand, the dependency makes it structurally difficult to add a project-scoped route *without* the check, since the route needs `project_id` from the URL either way. This is verified with a manual test (and can be extended into a `pytest` suite): a user with no membership row gets a `403` on a project's tasks/activity/members endpoints, not project data and not a `404` (a `404` would leak whether the project exists at all — `403` is more honest here).

### Activity Log: denormalized on write, not joined on read

The Activity Log needed to avoid N+1 queries — fetching 50 log entries shouldn't trigger 100 extra lookups for actor names and task titles.

Rather than solving this with `joinedload` at read time (a valid approach), this project denormalizes: `actor_name` and `task_title` are captured directly onto the `activity_logs` row **at write time**, alongside the foreign keys (`actor_id`, `task_id`) that preserve referential integrity. This means:
- Reading the log is a single flat query against one table — no joins are ever needed, so N+1 was never possible in the first place, rather than being patched around.
- The log reflects history accurately: if a user's name changes later, old log entries still correctly show what their name *was* at the time of the action, rather than silently rewriting history.

Every log entry is written inside the **same database transaction** as the mutation it describes (e.g. a task's status change and its corresponding log row are both written before a single `db.commit()`). This guarantees the log can never drift out of sync with what actually happened — a crash between the two would roll back both, not leave an orphaned task update with no audit trail.

A no-op guard prevents redundant entries: a `PATCH` request that "changes" a task to the status it already has does not produce a spurious `status_changed` entry, since the old and new values are compared before logging.

### Notifications: DB polling, not a job queue

Given the scope (in-app unread/read only, no email/push), notifications are implemented as a simple database table, polled by the frontend every ~10 seconds via `GET /notifications/unread-count`.

A background job system (Celery, Inngest, etc.) was deliberately **not** used here. That kind of infrastructure solves problems this project doesn't have yet — retries, delayed sends, distributed workers — and introducing it here would be complexity added for its own sake rather than because the requirements called for it. Polling is simple to reason about, trivial to implement correctly, and is genuinely how many real products start. If this needed to scale to real-time delivery across many concurrent users, the natural next step would be WebSockets or a message queue — but that's a deliberate future extension, not a gap in the current design.

### PATCH endpoints only update fields that were actually sent

`TaskUpdate` (and equivalent schemas) type every field as `Optional`, and the update endpoint uses `payload.model_dump(exclude_unset=True)` rather than applying every field on the model. This means a request like `{"status": "in_progress"}` only touches `status` — every other field on the task is left untouched. Without `exclude_unset=True`, omitted fields would come through as `None` and silently wipe existing data on every partial update.

### Validation lives at the API boundary, not just the database

Fields with a fixed set of valid values (task `status`, `priority`, membership `role`) are typed as enums in the Pydantic schemas, not plain strings. This means an invalid value (e.g. a typo like `"in progress"` instead of `"in_progress"`) is rejected with a clean `422` before the request ever reaches the database — rather than surfacing as an opaque `500` from a Postgres enum constraint violation. The database-level enum constraint still exists as a second line of defense, but the API-level validation is what gives clients (and this frontend) a usable error to react to.

## What's intentionally out of scope

- **Invite-by-email for users without an account.** Inviting currently requires the invited email to already belong to a registered user. Supporting pending invites for non-users (and the associated email-sending) was cut as a deliberate scope decision for a learning project.
- **Real-time updates via WebSockets.** See the Notifications section above — polling was chosen deliberately over this for the current scope.
- **Drag-and-drop task movement.** Status changes are handled via a dropdown control. Drag-and-drop was treated as a nice-to-have and can be added on top of the existing `PATCH` endpoint without backend changes.

## Project structure

```
team-task-board/
├── docker-compose.yml       # Postgres for local development
├── backend/
│   ├── main.py               # FastAPI app entrypoint
│   ├── database.py           # SQLAlchemy engine/session setup
│   ├── models.py              # SQLAlchemy models
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── auth.py                 # Password hashing, JWT creation/decoding
│   ├── deps.py                  # get_current_user, get_project_member dependencies
│   ├── activity.py                # log_activity, create_notification helpers
│   ├── alembic/                    # Migrations
│   └── routers/
│       ├── auth.py                    # signup/login/logout/me
│       ├── project.py                  # project CRUD, invites, members, activity log
│       ├── tasks.py                     # task CRUD, filters
│       └── notifications.py               # notification list/unread-count/mark-read
└── frontend/
    ├── app/
    │   ├── login/, signup/               # auth pages
    │   ├── projects/                      # project list
    │   └── projects/[id]/                  # project board
    ├── components/                          # TaskCard, ActivityLog, NotificationBell, etc.
    └── lib/                                   # api client, auth context, shared types
```

## Known limitations / things I'd do differently at scale

- `create_project` currently makes two separate commits (project, then membership row) rather than one atomic transaction — acceptable for now, but a production version should wrap both in a single transaction so a project can never exist without an admin member.
- Client-side filtering (assignee/priority) operates on the full fetched task list. The backend already supports server-side filtering via query params (`?assignee_id=&priority=`) for when task lists grow large enough that fetching everything becomes impractical.
