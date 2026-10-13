# 05 — REST API

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `https://api.<domain>/v1` |
| Format | JSON, fields in **`snake_case`** (like the company's other APIs) |
| Language | `Accept-Language: ka` / `en` (default `ka`). Translatable fields are returned in this language |
| Auth | `Authorization: Bearer <access_token>`. This header is added by the Next.js server (BFF) |
| Guest cart | `X-Cart-Token: <uuid>` (added by the BFF from a cookie) |
| Amounts | `{ "amount_minor": 15900, "currency": "GEL" }`. The frontend displays it as `159.00 ₾` |
| Dates | ISO 8601, UTC |
| Pagination | `?page=1&page_size=24` → `{ items, page, page_size, total }` |
| Sorting | `?sort=price_asc` / `price_desc` / `newest` / `relevance` |
| Errors | `application/problem+json` (see below) |
| Idempotency | `Idempotency-Key` header, required on `POST /checkout` |
| Documentation | Swagger UI: `/docs` (dev / staging only) |
| Versioning | `/v1` in the URL. Breaking change → `/v2` |

### Error format
```json
{
  "type": "https://icomers.ge/errors/out-of-stock",
  "title": "Out of stock",
  "status": 409,
  "code": "OUT_OF_STOCK",
  "detail": "Some products are no longer in stock",
  "errors": [{ "product_id": "…", "requested": 3, "available": 1 }],
  "trace_id": "4bf92f3577b34da6"
}
```
`code` is stable, and the frontend bases its decisions on it. The text may change.

| HTTP | When |
|---|---|
| 400 / 422 | Validation error |
| 401 | Token missing or expired |
| 403 | Role lacks sufficient permissions |
| 404 | Not found |
| 409 | Conflict: stock, invalid status transition, price change |
| 429 | Too many requests |
| 503 | A company microservice (Billing / Identity) is temporarily unavailable |

---

## 2. Public (no authentication)

| Method | Path | Description |
|---|---|---|
| GET | `/catalog/categories` | Category tree |
| GET | `/catalog/products` | List + filters (see below) |
| GET | `/catalog/products/{slug}` | Details, images, compatible models, stock status |
| GET | `/catalog/products/{slug}/related` | Similar products |
| GET | `/catalog/filters` | Available filters and counts for the current selection |
| GET | `/search/suggest?q=` | Autocomplete: products, categories, models |
| GET | `/compatibility/brands` | Charger brands |
| GET | `/compatibility/brands/{brand_slug}/models` | Models of a brand |
| GET | `/compatibility/models/{id}` | Model information |
| GET | `/health/live`, `/health/ready` | Kubernetes |

### `GET /catalog/products` filters
| Parameter | Example |
|---|---|
| `category` | `cables` (subcategories included) |
| `charger_model` | `uuid`: only compatible + universal |
| `charger_brand` | `wallbox` |
| `q` | Text search (name, SKU, OEM number) |
| `min_price`, `max_price` | In tetri |
| `in_stock` | `true` |
| `attr[connector]` | `Type 2` (dynamic attributes) |
| `sort`, `page`, `page_size` | |

Response:
```json
{
  "items": [{
    "id": "…", "slug": "type2-cable-32a-5m", "sku": "CBL-T2-32-5",
    "name": "Type 2 cable 32A, 5m",
    "price": { "amount_minor": 32900, "currency": "GEL" },
    "compare_at_price": null,
    "image": { "url": "https://cdn…/p/…/1.webp", "alt": "…" },
    "stock_status": "IN_STOCK",
    "is_compatible": true
  }],
  "page": 1, "page_size": 24, "total": 87
}
```
`stock_status`: `IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK`. The exact quantity is not publicly visible.

---

## 3. Customer (authenticated; the cart also works without login)

| Method | Path | Description |
|---|---|---|
| GET / PATCH | `/me` | Profile: name, phone, language |
| GET / POST | `/me/addresses` | Addresses |
| PATCH / DELETE | `/me/addresses/{id}` | |
| GET | `/cart` | Cart with current prices, availability and total |
| POST | `/cart/items` | `{ product_id, quantity }` |
| PATCH / DELETE | `/cart/items/{product_id}` | |
| POST | `/cart/merge` | Merge the guest cart after login |
| POST | `/checkout/preview` | Final total, stock check, price changes |
| POST | `/checkout` | Create the order + start payment (`Idempotency-Key`) |
| GET | `/orders` | My orders |
| GET | `/orders/{id}` | Details, status history, receipt |
| GET | `/orders/{id}/stream` | SSE: status changes (for the payment result page) |
| POST | `/orders/{id}/cancel` | Only in `PENDING_PAYMENT` status |
| POST | `/orders/{id}/retry-payment` | Retry a failed payment |

### `POST /checkout`
Request:
```json
{
  "fulfillment_method": "PICKUP",
  "address_id": null,
  "contact": { "name": "Giorgi", "phone": "+995 5xx xx xx xx", "email": "g@example.com" },
  "payment_provider": "BOG",
  "customer_note": "",
  "expected_total_minor": 32900
}
```
`expected_total_minor`: if the price has changed since the customer saw it, `409 PRICE_CHANGED` is returned and the customer is shown the new total.

Response `201`:
```json
{
  "order_id": "…",
  "order_number": "ICM-000123",
  "status": "PENDING_PAYMENT",
  "payment": { "redirect_url": "https://…" },
  "reservation_expires_at": "2026-10-13T10:30:00Z"
}
```

---

## 4. Admin (`/admin/*`, admin role required)

### Catalog
| Method | Path | Role |
|---|---|---|
| GET / POST | `/admin/products` | editor+ |
| GET / PATCH | `/admin/products/{id}` | editor+ |
| POST | `/admin/products/{id}/archive` | editor+ |
| POST | `/admin/products/{id}/images/presign` | editor+ → `{ upload_url, storage_key }` |
| POST / DELETE | `/admin/products/{id}/images` | editor+ |
| PUT | `/admin/products/{id}/compatibility` | editor+ `{ model_ids: [], is_universal }` |
| POST | `/admin/products/import` | admin (CSV / XLSX) |
| GET | `/admin/products/export` | editor+ |
| CRUD | `/admin/categories`, `/admin/charger-brands`, `/admin/charger-models` | editor+ |
| POST | `/admin/charger-models/{id}/products` | editor+ (link many products to one model) |

### Inventory
| Method | Path | Role |
|---|---|---|
| GET | `/admin/inventory?low_stock=true` | warehouse+ |
| POST | `/admin/inventory/{product_id}/movements` | warehouse+ `{ type, quantity, reason }` |
| GET | `/admin/inventory/{product_id}/movements` | warehouse+ |

### Orders
| Method | Path | Role |
|---|---|---|
| GET | `/admin/orders?status=&from=&to=&q=` | manager+, warehouse |
| GET | `/admin/orders/{id}` | manager+, warehouse |
| POST | `/admin/orders/{id}/transition` | manager+ / warehouse `{ to, comment }` |
| POST | `/admin/orders/{id}/cancel` | manager+ (paid orders are refunded automatically) |
| POST | `/admin/orders/{id}/refund` | admin `{ amount_minor, reason }` |
| POST | `/admin/orders/{id}/fiscal/retry` | admin |

### Other
| Method | Path | Role |
|---|---|---|
| GET | `/admin/customers`, `/admin/customers/{id}` | manager+ |
| GET | `/admin/dashboard/summary?period=today` | All admins |
| GET | `/admin/events/stream` | SSE, all admins |
| GET | `/admin/audit-log` | admin |

### Admin SSE format
```
event: order_paid
id: 0192f3c4-…
data: {"order_id":"…","order_number":"ICM-000123","total_minor":32900}

event: inventory_low_stock
data: {"product_id":"…","sku":"CBL-T2-32-5","available":1}
```
SSE rules (reconnect, heartbeat, reconcile): see [Architecture](02-architecture.md#6-sse-live-updates).

<details>
<summary>Technical details: rate limiting</summary>

| Endpoint group | Limit |
|---|---|
| Public catalog | 120 / min / IP |
| `/search/suggest` | 60 / min / IP |
| `/checkout` | 10 / min / user |
| Admin | 600 / min / user |

The first version uses `@nestjs/throttler`.

</details>

---

## 5. Frontend API client

The frontend code for calling the API and its types are **not written by hand**: they are generated automatically from the backend code.

```
NestJS code  ──►  openapi.json  ──►  TypeScript types  ──►  frontend
 (backend)       (API description)   (automatically)       (with autocomplete)
```

| Step | Tool | What it does |
|---|---|---|
| 1 | `@nestjs/swagger` | Generates the full API description (`openapi.json`) from the backend code: every URL, parameter and response shape. Swagger UI runs on it as well |
| 2 | `openapi-typescript` | Generates TypeScript types from this description |
| 3 | `openapi-fetch` | A small `fetch` wrapper that uses these types |

```ts
const { data } = await api.GET('/catalog/products', {
  params: { query: { category: 'cables', in_stock: true } },
});

data.items[0].price.amount_minor  // ✅ the editor suggests the fields for you
data.items[0].prise               // ❌ error: no such field exists
api.GET('/catalog/prodcts')       // ❌ error: no such URL exists
```

**Why:** when something changes in the backend (e.g. the price structure), the types are regenerated and TypeScript **shows an error in every place** in the frontend where the old structure is used. A mismatch between frontend and backend shows up while writing code, not when a customer sees a broken page.

```bash
# icomers-api:  generates openapi.json (automatically in CI)
pnpm openapi:export
# icomers-storefront / icomers-admin:  generates the types
pnpm api:generate
```
