# 10 — Deployment (usectl)

The shop runs on **usectl**. After a push to GitHub, usectl itself builds the image, runs the migrations and updates the apps. The database, NATS, S3 and monitoring are all within usectl as well.

## 1. Apps

| App | Repo | Type | What it does |
|---|---|---|---|
| `storefront` | `icomers-storefront` | web | public site |
| `admin` | `icomers-admin` | web | Admin Panel |
| `api` | `icomers-api` | web | REST API + SSE |
| `worker` | `icomers-api` | worker | NATS events, outbox, receipts, cron |
| `migrate` | `icomers-api` | release | database migrations, before every deploy |

- Migrations run before the web apps are updated, so new code always works against an already-updated database.
- Each repo has its own `Dockerfile` in its root. `api`, `worker` and `migrate` run from the same image with different commands.

## 2. Addons

| What | Purpose |
|---|---|
| **PostgreSQL** | the shop database |
| **NATS JetStream** | events with the company services |
| **S3** | product images |
| **GlitchTip** | error monitoring (frontend and backend) |

usectl provides the connection details (`DATABASE_URL`, `NATS_URL`, etc.) to the apps automatically. Secrets (client secret, session secret) are stored as protected variables.

## 3. Environments

| Environment | Branch | Billing / Fiscal |
|---|---|---|
| staging | `develop` | TBC / BOG sandbox |
| production | `main` | live |

## 4. SSE on usectl

Traffic path: browser → **Cloudflare** → **Traefik** → `api`. An SSE connection stays open for a long time, so:
- The server sends a heartbeat every 15 seconds so that an idle connection is not dropped.
- The response is neither cached nor buffered (`Cache-Control: no-cache`, `X-Accel-Buffering: no`).
- When the connection drops, the client reconnects and re-checks the data via REST (see [SSE rules](02-architecture.md#sse-rules)).

## 5. Health and scaling

- `/health/live`: the process is alive. `/health/ready`: Postgres and NATS are reachable. The company microservices are not checked here, so that the catalog keeps working when they are temporarily down.
- `storefront` and `api`: 2+ replicas, with autoscaling. `worker`: 1–2 replicas.
- On shutdown (`SIGTERM`) the app stops accepting new requests and finishes the ones in progress.

## 6. Monitoring, backups, rollback

- **Logs, metrics, tracing and alerts** are built into usectl. Alerts: 5xx, slow responses, crash loop, failed receipts.
- **Backup:** a daily Postgres backup, retained for 30 days.
- **Rollback:** return to the previous version from usectl. Rollback does not revert the database, so migrations are written to be backward compatible: first a new column is added, and the old one is dropped later.
