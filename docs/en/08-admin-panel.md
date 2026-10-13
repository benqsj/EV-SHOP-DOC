# 08 — Admin Panel (Next.js)

## 1. General
- A separate Next.js app on a separate domain (`admin.<domain>`); no SEO needed (`noindex`)
- Auth: the same Identity, client `icomers-admin`. Sign-in is allowed only with an admin role; otherwise a 403 page is shown
- UI: **shadcn/ui** + Tailwind, **TanStack Table** (sorting, filters, server-side pagination), **TanStack Query** (cache, mutations)
- Forms: react-hook-form + zod
- Language: mainly Georgian (en later, if needed)
- Live: `EventSource("/api/admin/events")`. Next.js (BFF) forwards it to the Shop API's `/admin/events/stream`. Rules: [SSE](02-architecture.md#6-sse-live-updates)

## 2. Modules

### 2.1 Dashboard
- Today / this week / this month: sales (₾), number of orders, average cart value
- **Live feed (SSE):** new orders and payments. An audible/visual notification for each new paid order
- Alerts: low stock, failed fiscal receipts, `needs_attention` orders
- Top-selling products

### 2.2 Orders
- List: filters (status, date, fulfillment method), search (number, phone, name)
- Live updates: new orders appear in the list automatically
- Details: lines, total, contact, address, payment status, receipt status, status timeline
- Actions: change status (only allowed transitions are shown), cancel, refund, internal note, print (picking list / receipt)

### 2.3 Products
- List: image, SKU, name, price, stock, status; bulk actions (activate, archive)
- Editor with tabs:
  - **General:** SKU, slug, category, price, old price, status, featured
  - **Content:** name and description in **ka / en** side by side; SEO fields
  - **Images:** drag & drop upload (presigned S3), reordering, alt text
  - **Specifications:** dynamic attributes
  - **Compatibility:** brand → multi-select of models, "Universal" checkbox, per-model note
  - **Stock:** current quantity + movement history
- Import/Export: CSV/XLSX (for the initial catalog population)

### 2.4 Categories
- Tree editor (drag & drop reordering), translations

### 2.5 Compatibility (chargers)
- Brands and models: CRUD, images
- **Model page:** all compatible products + "Add products" with search (bulk linking)
- **Matrix view** (optional): products × models, with checkboxes

### 2.6 Stock
- List: available / reserved / total, low-stock filter
- Actions: **Receipt** (RECEIPT), **Adjustment** (ADJUSTMENT, reason required), **Damage** (DAMAGE)
- History: who, when, how much, why

### 2.7 Customers
- List, search, order history, addresses
- Editing is limited: the core data lives in Identity

### 2.8 System (admin only)
- Audit log: filters by admin, object and date
- Failed events: list + "Resend"
- Settings: pickup address and opening hours, delivery price, reservation TTL, low-stock threshold

## 3. Roles and permissions

| Action | admin | manager | content_editor | warehouse |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| View orders | ✅ | ✅ | ❌ | ✅ |
| Change status | ✅ | ✅ | ❌ | ✅ (PROCESSING → READY / SHIPPED) |
| Cancel | ✅ | ✅ | ❌ | ❌ |
| Refund | ✅ | ❌ | ❌ | ❌ |
| Products / categories / compatibility | ✅ | 👁 | ✅ | 👁 |
| Change price | ✅ | ✅ | ✅ | ❌ |
| Stock movements | ✅ | ❌ | ❌ | ✅ |
| Customers | ✅ | ✅ | ❌ | ❌ |
| Import | ✅ | ❌ | ❌ | ❌ |
| Audit log, system, settings | ✅ | ❌ | ❌ | ❌ |

👁 = view only

- Roles come from the `roles` claim of the Identity token.
- **Checks are enforced in Nest** (`@Roles()` + `RolesGuard`). The Admin UI only hides buttons — that is not a security mechanism.
- Every action that changes data → `admin_audit_log` (automatically, via a Nest interceptor).
