# 03 — Integrations

The gRPC methods below describe what functionality the shop needs. Exact names and fields will be agreed according to the corresponding service's `.proto` contract.

## Service usage

| Service | How we use it |
|---|---|
| **Identity** | Login and registration (OAuth2 / OIDC), token verification, admin roles |
| **Billing** | gRPC: payment creation, refund. NATS: payment result |
| **Fiscal** | gRPC from the Worker: sale and refund receipts |
| **Notification** | Later. It currently handles push notifications, and a mobile app is not planned |

---

## 1. Identity — OAuth2 / OIDC

**What we already know** (from other company projects): Identity uses OAuth2, the access token is a **JWT**, the user ID is the `sub` claim (UUID), and refresh tokens are supported. In the shop, `customers.identity_user_id = sub`.

**What we additionally need:** OAuth2 tells us what the token is allowed to do. To know **who the user is** (name, email), we need **OpenID Connect (OIDC)**, which sits on top of OAuth2.

| Requirement | Why |
|---|---|
| OIDC Discovery / issuer URL | Automatic endpoint discovery |
| Authorization Code + PKCE | Secure login flow for the browser |
| JWKS endpoint | Shop API verifies tokens itself, without calling Identity on every request |
| `roles` claim | Admin roles: `admin`, `manager`, `content_editor`, `warehouse` |
| Two clients | `icomers-storefront` and `icomers-admin`, each with its own redirect URIs |
| Audience (`aud`) | `icomers-api`, so that another service's token does not work with us |

:::question id="identity-oidc" to="Identity team"
Which of the items listed in the table above are supported (OIDC discovery, PKCE, JWKS, `roles` claim, audience)? Can you register two clients (`icomers-storefront`, `icomers-admin`) and create the admin roles? Please provide the issuer URL (dev / staging / prod).
:::

:::question id="identity-login-ui" to="Identity team"
Is the login / registration page a hosted Identity page? Does it support Georgian and allow branding customization? Is registration by email, by phone (SMS), or both?
:::

:::question id="platform-s2s-auth" to="Platform / Backend team"
How is service-to-service authentication done over gRPC: **mTLS**, **service token**, or no authentication inside the internal network?
:::

### Login flow (BFF)

![Login flow](diagrams/login.svg)

- Tokens are stored on the Next.js server. The browser only has an httpOnly cookie; `localStorage` is not used. Why: see [SSE and authorization](02-architecture.md#sse-and-authorization-two-options).
- Shop API verifies the JWT (signature via JWKS, `iss`, `aud`, `exp`) and roles (`RolesGuard`).
- On first login, Shop API creates a `customers` record with the `sub`.
- Checkout requires login. The cart also works without login and is merged on login. Final decision: question `biz-guest-checkout`.

---

## 2. Billing — TBC / BOG

### gRPC methods

| Method | Input | Output |
|---|---|---|
| `CreatePayment` | `idempotency_key` (= `order_id`), `amount_minor`, `currency`, `provider` (TBC / BOG), `return_url` | `payment_id`, `status`, `redirect_url` |
| `GetPayment` | `payment_id` | `status`, `amount_minor` |
| `RefundPayment` | `payment_id`, `amount_minor`, `idempotency_key` | `refund_id`, `status` |

### Events (Billing → NATS)

Billing already publishes payment results to NATS. The shop receives these events with a durable consumer:

| Event | Shop reaction |
|---|---|
| Payment succeeded | Order → `PAID`, stock is written off, receipt is issued |
| Payment failed | Order → `PAYMENT_FAILED`, stock is released |
| Refund completed | Refund → `SUCCEEDED`, refund receipt |

:::question id="billing-events" to="Billing team"
What are the **exact subjects and payload schema** of the payment events (succeeded / failed / refund)? How do we pass `order_id` so that it comes back to us in the event? Does Billing receive the bank callback?
:::

:::question id="billing-idempotency" to="Billing team"
Is `CreatePayment` idempotent? That is, do two calls with the same `idempotency_key` create a single payment?
:::

:::question id="billing-refund" to="Billing team"
Are **partial refunds** possible? Roughly how many days does it take for the money to return to the card (to state in the text for customers)?
:::

:::question id="billing-expiry" to="Billing team"
After how long is an unpaid payment considered **expired**? The stock reservation timeout depends on this (currently 15 minutes).
:::

:::question id="billing-sandbox" to="Billing team"
Is there a **sandbox / test** environment for TBC and BOG to use on staging?
:::

:::question id="billing-methods" to="Billing team / Business"
Which payment methods are available: card only, or also Apple Pay / Google Pay / installments? Which ones do we want in the first version?
:::

---

## 3. Fiscal — RS.ge

| Method | Purpose |
|---|---|
| `IssueReceipt` | Sale receipt: lines (name, quantity, price, VAT), total, payment type |
| `IssueRefundReceipt` | Refund receipt, referencing the original receipt |

**When it is called:** the Worker receives the `shop.order.paid` event and calls `IssueReceipt`. On error it retries; if several attempts fail, the receipt becomes `FAILED` and the admin gets an alert with a "Retry" button.

:::question id="fiscal-sync" to="Fiscal team"
Does Fiscal return the receipt number **synchronously** in the gRPC response, or **asynchronously** (via its own NATS event)?
:::

:::question id="fiscal-when" to="Accounting"
Should the fiscal receipt be issued **at the moment of payment** or **when the item is handed over**?
:::

:::question id="fiscal-fields" to="Fiscal team"
Which fields does `IssueReceipt` require (product codes, units, VAT codes, payment type)? Can we show the customer a receipt link or PDF? Please provide an example.
:::

---

## 4. Notifications (email / SMS)

Order confirmations and status changes can be delivered to the customer in two ways:
- **A:** An email/SMS channel is added to the Notification service (centralized, for all company services)
- **B:** The Worker directly uses an email provider and a Georgian SMS provider

In both cases the source is an event: `shop.order.paid`, `shop.order.status_changed`.

:::question id="notif-channel" to="Backend team / Business"
Which channel should order notifications be sent through (email, SMS, both), and from where: will the Notification service be extended (A), or will the shop use a provider directly (B)?
:::

---

## 5. NATS JetStream

Stream: `SHOP`, subjects `shop.>`. Events published by the shop:

| Subject | When | Who listens |
|---|---|---|
| `shop.order.created` | Order created (before payment) | admin SSE |
| `shop.order.paid` | Payment confirmed | Worker (receipt), notifications, admin SSE |
| `shop.order.status_changed` | Admin changed the status | notifications, admin SSE |
| `shop.order.cancelled` | Order cancelled | Worker (refund), admin SSE |
| `shop.order.refunded` | Money refunded | Worker (refund receipt), admin SSE |
| `shop.inventory.low_stock` | Stock fell below the threshold | admin SSE |
| `shop.product.updated` | Product changed | Storefront refresh |

Format of every event (fields in `snake_case`):

```json
{
  "id": "0192f3c4-…",
  "type": "shop.order.paid",
  "version": 1,
  "occurred_at": "2026-10-13T10:15:00Z",
  "source": "icomers-api",
  "data": { "order_id": "…", "order_number": "ICM-000123", "total_minor": 15900, "currency": "GEL" }
}
```

When the event structure changes, `version` is incremented, and old fields are not removed.

<details>
<summary>Technical details: consumer parameters and proto files</summary>

| Parameter | Value |
|---|---|
| Type | durable, pull |
| `ack_policy` | explicit |
| `ack_wait` | 30s |
| `max_deliver` | 10 |
| `backoff` | 1s, 5s, 30s, 2m, 10m … |
| After exhaustion | `failed_events` table + alert in the admin panel |

`.proto` contracts are stored in `icomers-api/proto/`, and TypeScript code is generated from them with Buf + ts-proto. Event schemas live in `icomers-api/src/contracts/` (zod), so that the publisher and the consumer use the same schemas.

</details>

:::question id="proto-source" to="Backend team"
Where are the `.proto` contracts of the Identity / Billing / Fiscal services stored, and how do we get access to them (repo, Buf registry)?
:::

Network connectivity to NATS and company services: see question `platform-company-services` ([Deployment](10-deployment.md#11-to-clarify-with-platform)).
