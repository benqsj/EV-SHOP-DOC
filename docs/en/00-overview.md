# 00 — Overview

## 1. Goal

An online shop where the company sells **only its own products**: spare parts for EV chargers, cables, connectors, accessories, etc.

The main difference from a regular shop is the **compatibility filter**. The customer selects their charger (brand → model) and sees only the parts that fit it.

## 2. Scope

### In the MVP
- Product catalog with categories, search and filters
- Compatibility filter (charger brand → model)
- Two languages: Georgian (default) and English
- Currency: **GEL** only
- Registration / login via the existing **Identity** service (OAuth2 / OIDC)
- Cart, checkout, online card payment via **TBC / BOG** (**Billing** service)
- Fiscal receipt on RS.ge (**Fiscal** service)
- Customer account: orders, addresses, profile
- Admin Panel: products, categories, compatibility, stock, orders, customers, live dashboard
- Fulfillment: **pickup from the office** and/or **delivery managed manually by an admin** (no courier service integration)

:::question id="biz-fulfillment" to="Business"
Which fulfillment methods do we want in the MVP: only **pickup from the office**, or **manually managed delivery** as well? If delivery, what does it cost (flat fee / by city / free from X ₾)? What are the pickup address and opening hours?
:::


### Not in the MVP (later)
- B2B / companies (special prices, payment by invoice). **The schema is designed so this can be added later**
- Integration with courier companies
- Mobile app and push notifications
- Multiple warehouses
- Synchronization with ERP / accounting software
- Promo codes, discount rules, loyalty
- Ratings and reviews

## 3. Users and roles

| Role | Who | Where they work |
|---|---|---|
| Guest | Unauthenticated visitor | Storefront: browses, adds products to the cart |
| Customer (Individual) | Registered individual | Storefront: buys, views orders |
| Customer (Business) | Company — **later** | — |
| Admin | Full access | Admin Panel |
| Manager | Order management | Admin Panel |
| Content Editor | Catalog and compatibility | Admin Panel |
| Warehouse | Stock and order preparation | Admin Panel |

Detailed permissions: [08-admin-panel.md](08-admin-panel.md#3-roles-and-permissions).

## 4. Main scenarios

1. The customer selects "My charger: brand X, model Y" and sees only compatible parts.
2. The customer searches for a part by name, SKU or manufacturer (OEM) number.
3. The customer adds a part to the cart, goes through checkout, pays with TBC/BOG and receives a confirmation.
4. After payment, a fiscal receipt is issued automatically.
5. An admin sees a new order in real time, prepares it and changes its status.
6. An admin adds a product, uploads photos and specifies which models it fits.
7. An admin records a stock receipt or a stock adjustment. Every change is kept in the history.
8. An admin cancels a paid order: the refund goes through Billing, and the return receipt through Fiscal.

## 5. Non-functional requirements

| Topic | Requirement |
|---|---|
| Languages | ka (default), en. URL: `/ka/...`, `/en/...` |
| Currency | GEL. Prices are stored **in tetri (integer)** |
| VAT | Prices include VAT (18%), see the question below |
| Mobile | Mobile-first design |
| Performance | Product page: LCP < 2.5s; API p95 < 300ms (catalog) |
| SEO | SSR/ISR, sitemap, hreflang, Product JSON-LD |
| Reliability | A paid order and its receipt must never be lost, even if a service is temporarily down |
| Stock | The last unit must not be sold to two different buyers |
| Audit | Every admin change is written to the audit log |

:::question id="biz-vat" to="Accounting"
Are product prices stored and shown on the site **including VAT (18%)**? Are there any VAT-exempt products?
:::

:::question id="biz-guest-checkout" to="Business"
Can customers buy **without registering** (guest checkout)? Proposal: in the MVP, checkout requires login, while adding to the cart works without registration.
:::

## 6. Glossary

| Term | Meaning |
|---|---|
| SKU | Unique internal product code |
| OEM number | Manufacturer's part number |
| Charger model | A charger model that a part may fit |
| Compatibility | The "part ↔ charger model" relation |
| Reservation | Temporary hold of stock during checkout until the payment completes |
| Outbox | A database table from which events are reliably sent to NATS |
| BFF | Backend-for-Frontend. The server-side part of Next.js that stores the tokens |
| SSE | Server-Sent Events, a one-way live stream from the server to the browser |
| Minor units / tetri | 1 GEL = 100 tetri; all amounts are stored as integers |
