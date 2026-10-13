# 04 — Data Model (PostgreSQL)

## 1. Conventions

| Rule | Value |
|---|---|
| Primary key | `uuid` (`gen_random_uuid()`), except for join tables |
| Names | `snake_case` (in both the database and the API) |
| Time | `timestamptz`, UTC. Every table has `created_at`, `updated_at` |
| Amounts | `integer`, **in tetri** (`*_minor`). Currency `GEL` |
| Languages | Translatable text is stored in `*_translations` tables (`locale` = `ka` / `en`) |
| Deletion | Products are never deleted; they move to `ARCHIVED` status (orders need them). Everything else: hard delete, where it is safe |
| Snapshot | An order stores the product name, price and address **as they were at the time of the order**. Later changes are not reflected in old orders |
| Extensions | `pgcrypto`, `pg_trgm`, `citext` |

## 2. Domains and relationships

![Data model](diagrams/data-model.svg)

## 3. Tables

### Catalog

**`categories`**
| Column | Type | Note |
|---|---|---|
| id | uuid PK | |
| parent_id | uuid FK → categories, null | Tree (e.g. "Cables" → "Type 2 cables") |
| slug | text UNIQUE | For URLs; the same for both languages (Latin characters) |
| sort_order | int | |
| is_active | bool | |

**`category_translations`**: `(category_id, locale)` PK, `name`, `description`, `seo_title`, `seo_description`

**`products`**
| Column | Type | Note |
|---|---|---|
| id | uuid PK | |
| sku | text UNIQUE | Internal code |
| slug | text UNIQUE | |
| category_id | uuid FK | |
| status | enum `DRAFT` / `ACTIVE` / `ARCHIVED` | Only `ACTIVE` is visible on the Storefront |
| price_minor | int CHECK ≥ 0 | VAT included |
| compare_at_price_minor | int null | "Old price" (struck through) |
| vat_rate_bp | int default 1800 | VAT in basis points (18.00%) |
| oem_part_numbers | text[] | Manufacturer part numbers, for search |
| attributes | jsonb | Free-form attributes: `{ "voltage": "400V", "current": "32A", "connector": "Type 2" }` |
| weight_g | int null | For future delivery |
| is_featured | bool | Shown on the home page |
| created_at, updated_at | timestamptz | |

**`product_translations`**
| Column | Type | Note |
|---|---|---|
| product_id, locale | PK | |
| name | text | |
| short_description | text | |
| description | text | Markdown / rich text |
| seo_title, seo_description | text | |
| search_vector | tsvector GENERATED | `to_tsvector('simple', name ‖ short_description)` |

**`product_images`**: `id`, `product_id`, `storage_key`, `alt` (jsonb `{ka,en}`), `sort_order`, `width`, `height`

**`attribute_definitions`** *(optional, for filters)*: `key`, `label` (jsonb), `type` (`text`/`number`/`enum`), `options`, `is_filterable`. Lets the admin decide which `attributes` appear as filters.

### Compatibility

**`charger_brands`**: `id`, `slug` UNIQUE, `name`, `logo_key`, `sort_order`, `is_active`

**`charger_models`**
| Column | Type | Note |
|---|---|---|
| id | uuid PK | |
| brand_id | uuid FK | |
| slug | text | UNIQUE `(brand_id, slug)` |
| name | text | E.g. "Wallbox Pulsar Plus" |
| revision | text null | Version / revision / generation |
| power_kw | numeric null | |
| image_key | text null | So the customer can recognize the model visually |
| is_active | bool | |

**`product_compatibility`**
| Column | Type | Note |
|---|---|---|
| product_id | uuid FK | PK `(product_id, charger_model_id)` |
| charger_model_id | uuid FK | |
| note | text null | E.g. "Only for versions manufactured after 2023" |

Index: `(charger_model_id, product_id)`, because the filter works in exactly this direction.

> **Universal parts** (that fit every model): `products.is_universal bool`. The filter returns `compatible OR universal`.

### Inventory (single warehouse)

**`inventory_items`**
| Column | Type | Note |
|---|---|---|
| product_id | uuid PK FK | |
| on_hand | int | Physically in the warehouse |
| reserved | int | Held by unpaid orders |
| low_stock_threshold | int default 2 | |
| | CHECK | `on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand` |

Available quantity = `on_hand - reserved`.

**`stock_movements`** (ledger, INSERT only)
| Column | Type | Note |
|---|---|---|
| id | uuid | |
| product_id | uuid | |
| type | enum `RECEIPT` / `SALE` / `RETURN` / `ADJUSTMENT` / `DAMAGE` | |
| quantity | int | + or − |
| order_id | uuid null | |
| reason | text null | |
| actor_id | text null | Admin's identity id |
| created_at | timestamptz | |

**`stock_reservations`**: `id`, `order_id`, `product_id`, `quantity`, `status` (`ACTIVE` / `COMMITTED` / `RELEASED`), `expires_at`, index `(status, expires_at)`

### Customers

**`customers`** (local copy of Identity data + shop data)
| Column | Type | Note |
|---|---|---|
| id | uuid | |
| identity_user_id | text UNIQUE | `sub` from the token |
| type | enum `INDIVIDUAL` / `BUSINESS` | `BUSINESS` will be added later |
| email | citext null | |
| phone | text null | |
| first_name, last_name | text | |
| preferred_locale | text default `ka` | |
| created_at, updated_at | | |

**`addresses`**: `id`, `customer_id`, `label`, `recipient_name`, `phone`, `city`, `address_line`, `notes`, `is_default`

> **For future B2B:** `business_profiles` (`customer_id`, `company_name`, `tax_id`, `legal_address`), `price_lists` and `price_list_items` will be added. The current schema does not conflict with this.

### Cart

**`carts`**: `id`, `customer_id` UNIQUE null, `guest_token` UNIQUE null, `updated_at`, `expires_at`. CHECK: at least one of them must be set.

**`cart_items`**: `(cart_id, product_id)` PK, `quantity` CHECK > 0, `added_at`

The price is **not stored** in the cart: it is always read from `products`.

### Orders

**`orders`**
| Column | Type | Note |
|---|---|---|
| id | uuid | |
| number | text UNIQUE | Human-readable: `ICM-000123` (sequence) |
| customer_id | uuid FK | |
| status | enum | See [06-order-flow](06-order-flow.md#1-order-statuses) |
| fulfillment_method | enum `PICKUP` / `DELIVERY` | `DELIVERY` is handled manually by the admin |
| contact | jsonb | Snapshot: name, phone, email |
| shipping_address | jsonb null | Snapshot |
| subtotal_minor | int | |
| shipping_minor | int default 0 | |
| discount_minor | int default 0 | |
| total_minor | int | |
| vat_minor | int | VAT included in the total |
| currency | char(3) default `GEL` | |
| locale | text | Language in which the order was placed (for notifications) |
| customer_note | text null | |
| internal_note | text null | Admin only |
| placed_at, paid_at, completed_at, cancelled_at | timestamptz null | |

**`order_items`**: `id`, `order_id`, `product_id`, `sku`, `name` (jsonb `{ka,en}` snapshot), `unit_price_minor`, `quantity`, `vat_rate_bp`, `line_total_minor`

**`order_status_history`**: `id`, `order_id`, `from_status`, `to_status`, `actor_type` (`SYSTEM` / `CUSTOMER` / `ADMIN`), `actor_id`, `comment`, `created_at`

### Payments and receipts

**`payments`**: `id`, `order_id`, `provider` (`TBC` / `BOG`), `billing_payment_id` UNIQUE, `status` (`PENDING` / `SUCCEEDED` / `FAILED` / `EXPIRED`), `amount_minor`, `redirect_url`, `last_event` jsonb, timestamps

**`refunds`**: `id`, `payment_id`, `billing_refund_id`, `amount_minor`, `status`, `reason`, `actor_id`, timestamps

**`fiscal_receipts`**: `id`, `order_id`, `type` (`SALE` / `REFUND`), `status` (`PENDING` / `ISSUED` / `FAILED`), `external_id`, `receipt_url`, `error`, `attempts`, `issued_at`

### Technical tables

| Table | Purpose |
|---|---|
| `outbox_events` | `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload` jsonb, `created_at`, `published_at` null, `attempts`. Index: `WHERE published_at IS NULL` |
| `processed_events` | `(event_id, consumer)` PK, `processed_at`. Idempotent consumer |
| `failed_events` | Events that have exhausted the `max_deliver` limit |
| `idempotency_keys` | `key`, `customer_id`, `request_hash`, `response` jsonb, `created_at`. For `POST /checkout` |
| `admin_audit_log` | `id`, `actor_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `diff` jsonb, `ip`, `created_at` |

## 4. Important queries

### Compatibility filter
```sql
SELECT p.*
FROM products p
WHERE p.status = 'ACTIVE'
  AND (p.is_universal
       OR EXISTS (SELECT 1 FROM product_compatibility pc
                  WHERE pc.product_id = p.id AND pc.charger_model_id = $1));
```

### Search (Georgian + English + SKU / OEM)
Search uses Postgres full-text search (`simple` configuration) and `pg_trgm` (for similar and misspelled words), and also matches by SKU and OEM number.

<details>
<summary>Technical details: indexes and query</summary>

```sql
-- indexes
CREATE INDEX ON product_translations USING gin (search_vector);
CREATE INDEX ON product_translations USING gin (name gin_trgm_ops);
CREATE INDEX ON products USING gin (sku gin_trgm_ops);
CREATE INDEX ON products USING gin (oem_part_numbers);

-- query (simple version)
SELECT p.id, similarity(t.name, $q) AS score
FROM products p
JOIN product_translations t ON t.product_id = p.id AND t.locale = $locale
WHERE p.status = 'ACTIVE'
  AND ( t.search_vector @@ plainto_tsquery('simple', $q)
     OR t.name % $q
     OR p.sku ILIKE $q || '%'
     OR $q = ANY(p.oem_part_numbers) )
ORDER BY score DESC
LIMIT 20;
```

</details>

### Safe stock reservation (without race conditions)
```sql
UPDATE inventory_items
SET reserved = reserved + $qty, updated_at = now()
WHERE product_id = $id
  AND on_hand - reserved >= $qty
RETURNING product_id;
-- 0 rows → out of stock → roll back the entire checkout transaction
```
