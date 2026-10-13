# 02 — Architecture

## 1. System diagram

![System architecture](diagrams/architecture.svg)

## 2. Components

| Component | Responsibility |
|---|---|
| **Storefront** | Public site: rendering (SSR/ISR), login (BFF), API calls |
| **Admin Panel** | Internal panel: same login, admin roles only |
| **Shop API** | REST API: catalog, cart, checkout, orders, admin operations, SSE streams |
| **Shop Worker** | Background work: NATS events, outbox, expired reservations, fiscal receipts |
| **PostgreSQL** | All of the shop's own data |
| **NATS JetStream** | Events between services |
| **S3** | Product images (usectl S3 addon) |
| **Identity** | Company microservice: users, login, tokens, roles |
| **Billing** | Company microservice: payments via TBC / BOG, refunds, payment events |
| **Fiscal** | Company microservice: fiscal receipts to RS.ge |

The API and the Worker are **one codebase** (the `icomers-api` repo) with two entry points. They are deployed separately so that HTTP requests and background work do not interfere with each other.

## 3. NestJS modules (modular monolith)

The shop backend is **one application, strictly divided into modules internally**. Within the system of company microservices it is a single service that talks to the others over gRPC and NATS.

```
icomers-api/src/
  modules/
    auth/            # JWT validation (JWKS), Guards, @CurrentUser, @Roles
    catalog/         # categories, products, images, search
    compatibility/   # charger brands, models, product ↔ model link
    inventory/       # stock, movements, reservations
    customers/       # profile, addresses
    cart/            # cart (guest + user), merge on login
    orders/          # orders, statuses, state machine
    checkout/        # checkout: price → reservation → payment
    payments/        # Billing adapter, payment events
    fiscal/          # Fiscal adapter, receipts
    admin-events/    # SSE streams
    audit/           # admin audit log
  infra/             # prisma, nats, outbox, grpc, storage
  main.ts            # HTTP API
  worker.ts          # Worker
```

**Rules between modules:**
- A module never touches another module's tables directly. It gets another module's data only through that module's service. Thanks to this, any module can be split out into a separate service when needed.
- Integration with company microservices (Billing, Fiscal, Identity) goes through an **adapter** (the `PaymentGateway`, `FiscalGateway`, `IdentityGateway` interfaces). Each adapter has two implementations: **gRPC** (the real service) and **mock** (local development and automated tests). This way business logic does not depend on the details of the gRPC contract, and a contract change only affects the adapter.

## 4. When sync, when async

| Situation | Mechanism | Example |
|---|---|---|
| We need the answer **right now** | **gRPC** | Creating a payment and getting the redirect URL |
| Something "happened" and others need to know | **NATS** | `shop.order.paid` |
| Must happen together or not at all | **Postgres transaction** | Order + stock reservation + outbox record |
| The browser must see it live | **SSE** | New order on the admin dashboard |

### Core rules
- **Business logic lives only in NestJS.** Next.js only handles rendering and login (BFF).
- The frontend never touches gRPC or NATS, only REST and SSE.
- **Stock always changes inside a transaction**, together with the order. Never asynchronously.
- Price, VAT and totals are always calculated on the server.
- Every NATS consumer is **idempotent**: the same event may arrive twice, and the result must be the same.

### Order process and saga

- **Inside the shop** (order + stock): a local Postgres transaction, because this data lives in one database.
- **With company services** (Billing → Fiscal → refund): a distributed process with compensations, driven by events (choreography saga). For example: payment failed → the reservation is released; order cancelled → refund → refund receipt.
- The company's existing saga orchestrator (Charging) is used for charging sessions, which span several independent systems and last a long time.

:::question id="saga-orchestrator" to="Backend team (Charging saga)"
Should the shop's order process (payment → fiscal receipt → refund) be managed by the company's existing saga orchestrator instead of an event-driven flow? If so, what does integrating with it require?
:::

## 5. Outbox pattern

Problem: the order was written to the database, but the server went down before the event was sent to NATS, and the event was lost.

Solution: the event is first written to the database, in the same transaction, and then the Worker publishes it to NATS.

![Outbox pattern](diagrams/outbox.svg)

<details>
<summary>Technical details</summary>

- `Nats-Msg-Id` = event id. If the relay sends the same event twice, JetStream ignores the second one.
- The relay reads with `SELECT … WHERE published_at IS NULL FOR UPDATE SKIP LOCKED`, so that several Workers do not pick up the same event at the same time.
- Idempotent consumer:
  ```
  BEGIN
    INSERT INTO processed_events(event_id, consumer) … ON CONFLICT DO NOTHING
    -- already existed → already processed → ack and exit
    … business logic …
  COMMIT
  ack()
  ```

</details>

## 6. SSE (live updates)

SSE is used in two places: the **admin dashboard** (new orders, payments, alerts) and the **checkout result page** (order status after payment).

![SSE across multiple replicas](diagrams/sse-fanout.svg)

Each API pod receives NATS events itself and forwards them to its own browsers. This way every admin sees every event, regardless of which pod they are connected to.

### SSE rules
- **Events can be lost.** Events missed while the connection is down are not replayed. Therefore, after every reconnect the client reloads the data from REST once (reconcile). Polling is not used.
- **Reconnect:** exponential backoff from 1 second to 30 seconds, with jitter.
- **Heartbeat:** the server sends a `: ping` comment every 15 seconds so that the proxy does not close the connection.
- **Cache updates:** an event updates the TanStack Query cache directly (`setQueriesData`), so no extra request is made.
- **No optimistic updates.** An action (e.g. payment) returns an "accepted" response, and the real status arrives only via SSE or REST.
- **Proxy:** on usectl, traffic goes through Cloudflare and Traefik. The heartbeat keeps the connection open; details: [Deployment](10-deployment.md#4-sse-on-usectl).
- Event names are in `snake_case`: `order_created`, `order_paid`, `order_status_changed`, `inventory_low_stock`.

### SSE and authorization

The token is stored on the Next.js server (BFF); the browser only has an httpOnly cookie. The SSE connection is opened with a regular `EventSource` to Next.js, which forwards it to the Shop API with the token.

- **Security:** the token is not accessible to JavaScript, so it cannot be stolen through XSS. This is essential for a public shop where customers pay by card.
- **Token refresh in one place:** the Next.js server refreshes the token for every request, including SSE.
- **Simple client:** no polyfill and no separate refresh logic for SSE; `EventSource` reconnects on its own.

## 7. gRPC client rules

- Every call has a **deadline** (3–5 seconds). Waiting indefinitely is not allowed.
- Retry only on reads or on calls that accept an idempotency key (e.g. creating a payment with `order_id`).
- gRPC errors are mapped to HTTP statuses: `UNAVAILABLE` → 503, `INVALID_ARGUMENT` → 422, `NOT_FOUND` → 404.
