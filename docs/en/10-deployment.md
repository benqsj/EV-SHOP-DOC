# 10 — Deployment (usectl)

The shop runs on **usectl**. After a push to GitHub, usectl itself builds the image, runs the migrations and updates the apps. The database, NATS, S3, domains and monitoring are all within usectl as well.

## 1. Apps

All apps live in a single usectl **Machine** (`icomers`). Each app is deployed from its own repo.

| App | Repo | Type (kind) | What it does | Port | Domain |
|---|---|---|---|---|---|
| `storefront` | `icomers-storefront` | `web` | public site | 3000 | `shop.<domain>` |
| `admin` | `icomers-admin` | `web` | Admin Panel | 3001 | `admin.<domain>` |
| `api` | `icomers-api` | `web` | REST API + SSE | 4000 | `api.<domain>` |
| `worker` | `icomers-api` | `worker` | NATS events, outbox, receipts, cron | — | — (`--private`) |
| `migrate` | `icomers-api` | `release` | `prisma migrate deploy`, before every deploy | — | — |

- The **`release`** app runs on every deploy **before the web apps are updated**. So new code always works against an already-updated database.
- **`worker`** has no HTTP traffic and needs no domain.
- Deploy is automatic on GitHub push (`--auto-deploy`). Manually: `usectl machines deploy icomers`.

## 2. Dockerfiles

Each repo has its own `Dockerfile` in its root, and usectl uses it automatically.

| Repo | Image | usectl apps |
|---|---|---|
| `icomers-storefront` | Next.js `standalone` build | `storefront` |
| `icomers-admin` | Next.js `standalone` build | `admin` |
| `icomers-api` | NestJS build + Prisma | `api` (default command), `worker` (`--command "node dist/worker.js"`), `migrate` (`--command "npx prisma migrate deploy"`) |

The memory limit per pod is at most 1 GiB, which is enough for these apps.

<details>
<summary>Initial version of the Dockerfiles</summary>

`icomers-api`:
```dockerfile
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm build && pnpm prune --prod

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

`icomers-storefront` / `icomers-admin` (`output: 'standalone'` in `next.config.ts`):
```dockerfile
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

</details>

## 3. Addons

| What | usectl addon | Automatically provided to the app |
|---|---|---|
| **PostgreSQL** | Postgres. `dedicated` in production, with automatic backups | `DATABASE_URL` |
| **NATS JetStream** | Connection to Billing's NATS (see question `platform-company-services`). JetStream works only on `dedicated` NATS | `NATS_URL`, `NATS_USER`, `NATS_PASSWORD` |
| **S3** | S3 addon (managed). Public CDN for product images | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` |
| **Errors** | GlitchTip (Sentry-compatible) | `SENTRY_DSN` |

- An addon must be attached to each app separately (`attach-addon`). `DATABASE_URL` is needed by `api`, `worker` and `migrate`.
- Addon variables are not added manually.
- The S3 client needs `forcePathStyle: true`.

## 4. SSE on usectl

Traffic path: browser → **Cloudflare** → **Traefik** → `api`. An SSE connection stays open for a long time. To keep it alive:
- The server sends a heartbeat every 15 seconds. Cloudflare drops an idle connection after ~100 seconds, and the heartbeat prevents this.
- The response has `Cache-Control: no-cache` and `X-Accel-Buffering: no`.
- When the connection drops, the client reconnects and re-checks the data via REST (see [SSE rules](02-architecture.md#sse-rules)).

SSE behaviour on usectl will be verified on staging (question `usectl-sse`).

## 5. Env variables and secrets

- Shared variables (e.g. `OIDC_ISSUER`) are set **at the Machine level**, while variables used by a single app only (e.g. `API_URL` for the frontends) are set **at the app level**.
- Secrets (`OIDC_CLIENT_SECRET`, `SESSION_SECRET`) are marked as **protected**: they cannot be read, only written.
- `NEXT_PUBLIC_*` variables are needed by Next.js at build time: `usectl vars expose … --build-target build_arg`.
- Changing a variable requires a new deploy.

Full list of variables: [Repo & Dev](09-repo-and-dev.md#3-configuration-and-code-rules).

## 6. Domains

In DNS, `CNAME → custom.usectl.com`, then `usectl domains verify` and `attach-app` to the corresponding app. Cloudflare issues the TLS certificate automatically.

On `*.usectl.com` (for staging) only a **single-level** name is used, e.g. `icomers-api.usectl.com`. For a multi-level name like `api.icomers.usectl.com`, Cloudflare cannot issue a certificate and the browser shows `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`.

## 7. Environments

| Environment | Where | Branch | Billing / Fiscal |
|---|---|---|---|
| local | docker-compose | — | mock |
| staging | Machine group `stage` (separate namespace and separate addons) | `develop` | TBC / BOG sandbox, test |
| production | Machine `icomers` | `main` | live |

PR preview environments are disabled initially: they share the parent's database, and migrations could change the staging database.

## 8. Health and scaling

| Endpoint | What it checks |
|---|---|
| `/health/live` | the process is alive |
| `/health/ready` | Postgres and NATS connection. The company microservices are not checked, so that the catalog keeps working when they are temporarily down |

- `storefront` and `api`: 2+ replicas, autoscaling (usectl autoscales only web apps).
- `worker`: 1–2 replicas. The outbox works safely on several replicas as well.
- On `SIGTERM` the app stops accepting new requests, closes SSE connections and finishes the events in progress.

## 9. Monitoring

Everything is built into usectl:

| What | Where |
|---|---|
| Logs | Loki: `usectl machines logs icomers api -f` |
| Metrics | requests, p95, 5xx, CPU and memory. Our own `/metrics` (outbox backlog, failed events) once usectl enables support for it |
| Tracing | OpenTelemetry → Tempo (HTTP, gRPC and NATS) |
| Errors | GlitchTip (`SENTRY_DSN`), both frontend and backend |
| Alerts | Slack or webhook (email does not work): 5xx %, p95, crash loop, OOM, failed receipts |

## 10. Backups and rollback

- **Postgres:** daily `pg_dump` on the `dedicated` addon, retained for 30 days.
- **Rollback:** `usectl machines rollback icomers <deployment>`, or automatic if 5xx errors increase after a deploy. Rollback does not revert the database, so migrations are always written to be backward compatible: first a new column is added, and the old one is dropped later.

## 11. To clarify with Platform

:::question id="platform-company-services" to="Platform / Backend team"
Are Billing, Fiscal and Identity on usectl? usectl Machines are isolated from each other and access to internal IPs is blocked. How do we reach these services over gRPC, and Billing's NATS (e.g. by sharing an addon, `--shared-from`)?
:::

:::question id="usectl-sse" to="Platform (usectl)"
Does SSE (a long-lived open HTTP connection with a heartbeat every 15 seconds) work through Cloudflare and Traefik without restrictions? How are the health check path and port configured?
:::

:::question id="platform-envs" to="Platform / Business"
Which domains should we use (`shop.…`, `admin.…`, `api.…`)? Is Machine group `stage` suitable for staging, or is a separate Machine better? Is a daily backup sufficient for the production database?
:::
