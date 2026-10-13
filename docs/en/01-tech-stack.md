# 01 — Tech Stack

> All decisions are **proposals** until this document is approved.

## 1. Technologies

| Layer | Technology | Why |
|---|---|---|
| Language | **TypeScript** (Node.js 24 LTS) | One language for frontend and backend, shared types |
| Storefront | **Next.js** (App Router), Tailwind CSS, next-intl | SEO: pages are rendered on the server; ISR: the catalog is served from cache and refreshed when a product changes; ka / en |
| Admin Panel | **Next.js**, shadcn/ui, TanStack Query + Table | Same technology as the Storefront; ready-made tables, forms and cache |
| Backend | **NestJS** | Built-in gRPC client; modules and DI give a clear structure; OpenAPI is generated automatically with `@nestjs/swagger` |
| Worker | Same NestJS code, separate process | Background work (events, receipts, cron) does not slow down the HTTP API |
| API | **REST + OpenAPI**, `snake_case` fields | A familiar approach; Swagger UI for testing; the convention of the company's other APIs |
| API client | **openapi-typescript + openapi-fetch** | Frontend types are generated from the backend code, not written by hand (see [REST API](05-api.md#5-frontend-api-client)) |
| Database | **PostgreSQL 16+** | Transactions (order + stock together); JSONB for attributes; full-text search and `pg_trgm` |
| ORM | **Prisma** | Typed client, migrations, Prisma Studio; raw SQL when needed |
| gRPC | `@grpc/grpc-js` + Buf + ts-proto | TypeScript clients from the `.proto` contract |
| Messaging | **NATS JetStream** (nats.js) | Already used by company microservices (Billing); events are persisted and not lost; dedupe and retry |
| Real-time | **SSE** | We only need the server → browser direction; works over plain HTTP |
| Files | S3 (usectl S3 addon) | Product images, uploaded directly from the Admin Panel (presigned URL) |
| Repos | 3 separate repos (api, storefront, admin), pnpm | Company style; independent deploys; types are generated from OpenAPI ([Repo & Dev](09-repo-and-dev.md#1-repositories)) |
| Tests | Vitest / Jest, Testcontainers, Playwright | Real Postgres and NATS in tests; E2E in the browser |
| Deploy | **usectl** (Kubernetes) | Push-to-deploy, Postgres / NATS / S3 addons, domains, logs and alerts in one place |

**We do not need Redis in the first version.** The cart is stored in Postgres, NATS plays the role of the queue, and Next.js handles caching. It can be added later if needed.

## 2. Key decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The Shop backend is a **modular monolith**: one NestJS app, split into modules internally | The shop domain is cohesive; order and stock in one transaction; simple deploy. A module can be extracted into a separate service if needed ([Architecture](02-architecture.md#3-nestjs-modules-modular-monolith)) |
| D2 | The frontend uses only REST and SSE; gRPC and NATS live only in the backend | The frontend does not depend on internal systems |
| D3 | Authentication: Identity (OAuth2 / OIDC), tokens in an httpOnly cookie (BFF) | The token is not visible to JavaScript; SSE works easily ([Integrations](03-integrations.md#1-identity--oauth2--oidc)) |
| D4 | Asynchronous processes: NATS JetStream + Outbox pattern | No event is lost, even if a service is temporarily down |
| D5 | `snake_case` fields in the API and events | A consistent style with the company's other services |
| D6 | Prices as integers, in tetri | No rounding errors |

## 3. Alternatives considered

| Alternative | Why we did not choose it |
|---|---|
| **Drizzle** (ORM) | Prisma's tooling (Studio, migrations) is more convenient for this project |
| **Splitting the Shop into several microservices** | Order and stock must be in one transaction; splitting would require sagas and extra infrastructure. It can still be split later if needed |
