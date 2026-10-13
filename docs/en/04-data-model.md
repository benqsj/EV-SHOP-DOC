# 04 — Data Model (PostgreSQL)

## 1. Core rules

| Rule | Value |
|---|---|
| Primary key | `uuid` |
| Names | `snake_case` (in both the database and the API) |
| Time | `timestamptz`, UTC |
| Amounts | Integers, **in tetri** (`*_minor`). Currency `GEL` |
| Languages | Translatable text (name, description, SEO) is stored in `*_translations` tables, `ka` / `en` |
| Deletion | Products are never deleted; they move to `ARCHIVED` status, because old orders need them |
| Snapshot | An order stores the product name, price and address as they were at the time of the order. Later changes are not reflected in old orders |

## 2. Domains and relationships

![Data model](diagrams/data-model.svg)

## 3. Tables

### Catalog

- **`categories`**: the category tree (e.g. "Cables" → "Type 2 cables").
- **`products`**: SKU, price (VAT included), status (`DRAFT` / `ACTIVE` / `ARCHIVED`), manufacturer (OEM) part numbers for search. Technical attributes (voltage, current, connector) are stored in a single JSONB field, because different parts have different attributes.
- **`product_images`**: product images in S3, in display order.

### Compatibility

- **`charger_brands`** and **`charger_models`**: charger brands and models.
- **`product_compatibility`**: the link between a product and a charger model (which models a part fits).
- A universal part that fits every model is marked with a single field and needs no links.

### Inventory (single warehouse)

- **`inventory_items`**: two numbers per product: stock in the warehouse (`on_hand`) and stock held by unpaid orders (`reserved`). Available is `on_hand - reserved`.
- **`stock_movements`**: the history of every stock change (receipt, sale, return, adjustment). Records are only added, never changed.
- **`stock_reservations`**: quantities held during checkout, with an expiry (15 minutes).

### Customers and cart

- **`customers`**: the customer, linked to Identity by `sub`. A company profile will be added later for B2B.
- **`addresses`**: delivery addresses.
- **`carts`** and **`cart_items`**: the cart, with or without login. The price is not stored in the cart; it is always read from the product.

### Orders, payments and receipts

- **`orders`** and **`order_items`**: the order, its totals and the product snapshot.
- **`order_status_history`**: every status change: who, when, from and to.
- **`payments`** and **`refunds`**: Billing payments and refunds.
- **`fiscal_receipts`**: sale and refund receipts and their status.

### Technical tables

| Table | Purpose |
|---|---|
| `outbox_events` | Events to be sent to NATS ([Outbox pattern](02-architecture.md#5-outbox-pattern)) |
| `processed_events` | Events already processed, so that an event is not processed twice |
| `failed_events` | Events that could not be processed after several attempts |
| `idempotency_keys` | Detecting a repeated checkout request |
| `admin_audit_log` | Every change made by an admin |

## 4. Key logic

- **Compatibility filter:** for the model the customer selected, the active products linked to that model are shown, plus all universal parts.
- **Search:** in Georgian and English, using Postgres full-text search; `pg_trgm` for misspelled words; also by SKU and OEM number.
- **Stock reservation:** the quantity is increased with a single `UPDATE`, only on the condition that enough stock is available. This way two simultaneous checkouts cannot take the same last unit. If there is no stock, the whole checkout transaction is rolled back.
