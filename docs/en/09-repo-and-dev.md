# 09 — Repo structure and development

## 1. Repositories

The code is split into **three separate repos**, as in the company's other projects (e.g. ev-charger-admin). Each has its own Dockerfile, CI and deploy.

| Repo | What it is | usectl apps |
|---|---|---|
| `icomers-api` | NestJS: REST API, worker, migrations | `api`, `worker`, `migrate` |
| `icomers-storefront` | Next.js: public site | `storefront` |
| `icomers-admin` | Next.js: Admin Panel | `admin` |

The documentation (this folder) is kept separately; once approved, the code repos will reference it.

### `icomers-api`
```
icomers-api/
├─ src/
│  ├─ modules/            # catalog, cart, orders, payments, … (see architecture)
│  ├─ infra/              # prisma, nats, outbox, grpc, storage
│  ├─ contracts/          # NATS event schemas (zod)
│  ├─ main.ts             # HTTP API
│  └─ worker.ts           # Worker
├─ proto/                 # .proto contracts of company services + generated code
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts             # test catalog, brands, models
├─ dev/                   # NATS setup, Billing / Fiscal / Identity mocks
├─ openapi.json           # API description (updated by CI); the frontends generate their client from it
├─ docker-compose.yml     # local infrastructure
├─ Dockerfile
└─ .env.example
```

### `icomers-storefront` and `icomers-admin`
```
icomers-storefront/
├─ src/
│  ├─ app/                # Next.js pages
│  ├─ components/
│  ├─ api/schema.ts       # API types, generated from openapi.json
│  └─ messages/           # ka.json, en.json
├─ Dockerfile
└─ .env.example
```
The admin has the same structure.

### How the frontend gets the API types
The `icomers-api` CI updates `openapi.json` on every change. In the frontend repo, a single command generates the types:
```bash
pnpm api:generate   # openapi-typescript <openapi.json of the api> -o src/api/schema.ts
```
The source can be the local API (`http://localhost:4000/docs-json`) or staging. If something changes in the backend, after the types are updated TypeScript shows every mismatching place in the frontend.

## 2. Local environment

The `docker-compose.yml` in `icomers-api` runs the infrastructure. The apps run locally with `pnpm dev`, each in its own repo:

| Service | Image | Port |
|---|---|---|
| postgres | `postgres:16` | 5432 |
| nats | `nats:2` (with `-js` JetStream) | 4222, 8222 (monitoring) |
| minio | `minio/minio` (local S3) | 9000, 9001 (console) |
| mailpit | `axllent/mailpit` (email testing) | 1025, 8025 |
| identity | Keycloak or your Identity dev instance | 8080 |

### Mocks
Until we have access to dev instances of the existing services:
- `PAYMENT_GATEWAY=mock`: `CreatePayment` returns a local "bank" page (`/dev/fake-bank`) whose "Pay" / "Decline" buttons publish a `billing.payment.*` event to NATS
- `FISCAL_GATEWAY=mock`: returns a fake receipt number
- Identity: a local Keycloak realm (`dev/keycloak/realm.json`) with the same roles

### Commands
```bash
# icomers-api
docker compose up -d
cp .env.example .env
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev            # api :4000
pnpm dev:worker     # worker

# icomers-storefront / icomers-admin
pnpm install
pnpm dev            # storefront :3000 / admin :3001
```

## 3. Configuration and code rules

<details>
<summary>Environment variables</summary>

| Variable | Example |
|---|---|
| `DATABASE_URL` | `postgresql://icomers:icomers@localhost:5432/icomers` |
| `NATS_URL` | `nats://localhost:4222` |
| `OIDC_ISSUER` | `https://id.example.ge/realms/main` |
| `OIDC_AUDIENCE` | `icomers-api` |
| `GRPC_BILLING_URL` / `GRPC_FISCAL_URL` / `GRPC_IDENTITY_URL` | `billing:50051` |
| `PAYMENT_GATEWAY` / `FISCAL_GATEWAY` | `grpc` / `mock` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL` | |
| `RESERVATION_TTL_MINUTES` | `15` |
| `STOREFRONT_URL`, `STOREFRONT_REVALIDATE_SECRET` | |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` |
| `LOG_LEVEL` | `info` |

For the Next.js apps: `API_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`.

Config is validated at startup (zod / `@nestjs/config`). If the config is invalid, the app does not start.

</details>

<details>
<summary>Code rules</summary>

- TypeScript `strict: true`
- ESLint + Prettier, `lint-staged` + `husky` pre-commit
- Conventional Commits (`feat:`, `fix:`, `docs:`...)
- Business logic lives in services; controllers are thin
- Every DTO is described with `@nestjs/swagger` decorators so the OpenAPI spec is complete
- Money is stored only as `*_minor` integers; formatting is done by a single helper function

</details>

## 4. Tests

| Level | Tool | What we test |
|---|---|---|
| Unit | Vitest / Jest | price calculation, VAT, state machine, validation |
| Integration | Jest + **Testcontainers** (Postgres, NATS) | checkout transaction, stock race condition (parallel requests), outbox relay, idempotent consumers |
| Contract | gRPC mock servers | Billing/Fiscal adapters |
| E2E | **Playwright** | catalog → cart → checkout → (mock) payment → order PAID; admin: status change |

**Mandatory test:** 10 parallel checkouts on the same last unit → only 1 must succeed.

## 5. CI

Each repo has its own CI:

| Stage | What is checked |
|---|---|
| Pull request | lint, typecheck, tests, build. Additionally in `icomers-api`: Prisma schema check and a warning on OpenAPI breaking changes |
| Merge into `develop` | usectl automatically builds and updates staging |
| Merge into `main` | production |
