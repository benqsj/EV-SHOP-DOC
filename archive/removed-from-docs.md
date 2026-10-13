# დოკუმენტაციიდან ამოღებული ნაწილები

ეს ფაილი დოკუმენტაციის საიტზე არ ჩანს. აქ ინახება ის ტექსტი, რომელიც დოკუმენტაციიდან ამოვიღეთ, თუ მოგვიანებით დაგვჭირდება.

## 1. ღია კითხვები

### Billing: ნაწილობრივი refund (03 — Integrations)

:::question id="billing-refund" to="Billing გუნდი"
შესაძლებელია **ნაწილობრივი refund**? დაახლოებით რამდენ დღეში ბრუნდება თანხა ბარათზე (მომხმარებლისთვის ტექსტში დასაწერად)?
:::

### Identity: login გვერდი (03 — Integrations)

:::question id="identity-login-ui" to="Identity გუნდი"
Login / რეგისტრაციის გვერდი Identity-ის hosted გვერდია? აქვს ქართული ენის მხარდაჭერა და ბრენდინგის შეცვლის შესაძლებლობა? რეგისტრაცია email-ით, ტელეფონით (SMS) თუ ორივეთი?
:::

### შეტყობინებების არხი (03 — Integrations)

პასუხი: მხოლოდ email; სხვა არხი საჭიროების შემთხვევაში დაემატება.

შეკვეთის დადასტურება და სტატუსის ცვლილება მომხმარებელს ორი გზით შეიძლება მივაწოდოთ:
- **A:** Notification სერვისს დაემატება email/SMS არხი (ცენტრალიზებული, კომპანიის ყველა სერვისისთვის)
- **B:** Worker პირდაპირ იყენებს email provider-ს და ქართულ SMS provider-ს

ორივე შემთხვევაში წყარო ივენთია: `shop.order.paid`, `shop.order.status_changed`.

:::question id="notif-channel" to="Backend გუნდი / ბიზნესი"
შეკვეთის შეტყობინებები რომელი არხით გაიგზავნოს (email, SMS, ორივე) და საიდან: Notification სერვისი გაფართოვდება (A), თუ მაღაზია პირდაპირ provider-ს გამოიყენებს (B)?
:::

### ანალიტიკა და ხარისხი (07 — Storefront §8)

მიზნები: Core Web Vitals-ის „კარგი“ ზონა (LCP < 2.5s), კლავიატურით ნავიგაცია და საკმარისი კონტრასტი (WCAG AA). ანალიტიკა ირთვება მხოლოდ cookie consent-ის შემდეგ.

:::question id="biz-analytics" to="ბიზნესი / მარკეტინგი"
რომელი ანალიტიკა გამოვიყენოთ: **GA4**, **Plausible**, თუ სხვა? საჭიროა თუ არა Meta Pixel ან სხვა სარეკლამო tracking?
:::

### Platform (10 — Deployment §11)

:::question id="platform-company-services" to="Platform / Backend გუნდი"
Billing, Fiscal და Identity usectl-ზეა? usectl-ის Machine-ები ერთმანეთისგან იზოლირებულია და შიდა IP-ებზე წვდომა დაბლოკილია. როგორ მივწვდეთ ამ სერვისებს gRPC-ით და Billing-ის NATS-ს (მაგ. addon-ის გაზიარებით, `--shared-from`)?
:::

:::question id="usectl-sse" to="Platform (usectl)"
SSE (დიდხანს ღია HTTP კავშირი, heartbeat ყოველ 15 წამში) Cloudflare-სა და Traefik-ზე შეზღუდვის გარეშე მუშაობს? როგორ კონფიგურირდება health check-ების path და port?
:::

:::question id="platform-envs" to="Platform / ბიზნესი"
რა domain-ები გამოვიყენოთ (`shop.…`, `admin.…`, `api.…`)? Staging-ისთვის Machine group `stage` გამოდგება, თუ ცალკე Machine ჯობია? Production-ის ბაზისთვის ყოველდღიური ბექაპი საკმარისია?
:::

### ზოგადი კითხვები (12 — Roadmap)

:::question id="biz-catalog-source" to="ბიზნესი"
სად ინახება ახლა საწყისი კატალოგი (Excel, 1C, სხვა)? რა ველები აქვს (SKU, სახელი, ფასი, მარაგი, თავსებადი მოდელები, ფოტოები)? დაახლოებით რამდენი პროდუქტია?
:::

:::question id="biz-charger-models" to="ბიზნესი"
რომელი დამტენის ბრენდები და მოდელები უნდა იყოს თავსებადობის სიაში? არსებობს მზა სია?
:::

:::question id="docs-approval" to="ყველა"
გაქვთ თუ არა დოკუმენტაციასთან დაკავშირებული შენიშვნები ან ცვლილებები, რომლებიც დამტკიცებამდე უნდა გავითვალისწინოთ?
:::

## 2. ლოკალური დეველოპმენტი (09 — Repo & Dev)

დოკუმენტაცია (ეს ფოლდერი) ცალკე ინახება; დამტკიცების შემდეგ კოდის რეპოები მასზე მიუთითებენ.

#### Mock-ები
სანამ არსებული სერვისების dev ინსტანსებზე წვდომა არ გვაქვს:
- `PAYMENT_GATEWAY=mock`: `CreatePayment` აბრუნებს ლოკალურ „ბანკის“ გვერდს (`/dev/fake-bank`), რომელზეც „გადახდა“ / „უარყოფა“ ღილაკები აქვეყნებს `billing.payment.*` ივენთს NATS-ში
- `FISCAL_GATEWAY=mock`: აბრუნებს ჩეკის ყალბ ნომერს
- Identity: ლოკალური Keycloak realm (`dev/keycloak/realm.json`) იგივე როლებით

#### ბრძანებები
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

docker-compose-ის ცხრილში იყო: `identity | Keycloak ან კომპანიის Identity-ის dev ინსტანსი | 8080`

## 3. Deployment-ის დეტალები (10 — Deployment)

### Dockerfile-ები

| რეპო | Image | usectl აპები |
|---|---|---|
| `icomers-storefront` | Next.js `standalone` build | `storefront` |
| `icomers-admin` | Next.js `standalone` build | `admin` |
| `icomers-api` | NestJS build + Prisma | `api` (ნაგულისხმევი ბრძანება), `worker` (`--command "node dist/worker.js"`), `migrate` (`--command "npx prisma migrate deploy"`) |

მეხსიერების ლიმიტი ერთ pod-ზე მაქსიმუმ 1 GiB-ია, რაც ამ აპებისთვის საკმარისია.

<details>
<summary>Dockerfile-ების საწყისი ვერსია</summary>

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

`icomers-storefront` / `icomers-admin` (`next.config.ts`-ში `output: 'standalone'`):
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

### Addon-ები, ცვლადები, domain-ები, გარემოები

| რა | usectl addon | აპს ავტომატურად ეძლევა |
|---|---|---|
| **PostgreSQL** | Postgres. Production-ში `dedicated`, ავტომატური ბექაპით | `DATABASE_URL` |
| **NATS JetStream** | Billing-ის NATS-თან კავშირი (იხ. კითხვა `platform-company-services`). JetStream მხოლოდ `dedicated` NATS-ზე მუშაობს | `NATS_URL`, `NATS_USER`, `NATS_PASSWORD` |
| **S3** | S3 addon (managed). პროდუქტის სურათებისთვის public CDN | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` |
| **შეცდომები** | GlitchTip (Sentry-თავსებადი) | `SENTRY_DSN` |

- addon-ი თითოეულ აპს ცალკე უნდა მიუერთდეს (`attach-addon`). `DATABASE_URL` სჭირდება `api`-ს, `worker`-ს და `migrate`-ს.
- addon-ის ცვლადები ხელით არ ემატება.
- S3 client-ში საჭიროა `forcePathStyle: true`.

- **Machine-ის დონეზე** საერთო ცვლადები (მაგ. `OIDC_ISSUER`), **აპის დონეზე** კი მხოლოდ ერთი აპის ცვლადები (მაგ. `API_URL` ფრონტებისთვის).
- საიდუმლოები (`OIDC_CLIENT_SECRET`, `SESSION_SECRET`) მონიშნულია **protected**-ად: მათი წაკითხვა შეუძლებელია, მხოლოდ ჩაწერა.
- `NEXT_PUBLIC_*` ცვლადები Next.js-ს build-ის დროს სჭირდება: `usectl vars expose … --build-target build_arg`.
- ცვლადის შეცვლა ახალ deploy-ს მოითხოვს.

ცვლადების სრული სია: [Repo & Dev](09-repo-and-dev.md#3-კონფიგურაცია-და-კოდის-წესები).

#### Domain-ები

DNS-ში `CNAME → custom.usectl.com`, შემდეგ `usectl domains verify` და `attach-app` შესაბამის აპზე. TLS სერტიფიკატს Cloudflare ავტომატურად გასცემს.

`*.usectl.com` მისამართზე (staging-ისთვის) გამოიყენება მხოლოდ **ერთდონიანი** სახელი, მაგ. `icomers-api.usectl.com`. `api.icomers.usectl.com`-ის მსგავსი მრავალდონიანი სახელისთვის Cloudflare სერტიფიკატს ვერ გასცემს და ბრაუზერი აჩვენებს `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`-ს.

#### გარემოები

| გარემო | სად | Branch | Billing / Fiscal |
|---|---|---|---|
| local | docker-compose | — | mock |
| staging | Machine group `stage` (ცალკე namespace და ცალკე addon-ები) | `develop` | TBC / BOG sandbox, test |
| production | Machine `icomers` | `main` | live |

PR preview გარემოები თავიდან გამორთულია: ისინი მშობლის ბაზას იზიარებენ და მიგრაციებმა შეიძლება staging-ის ბაზა შეცვალონ.

## 4. Data model-ის სრული ვერსია (04 — Data Model)

### 04 — Data Model (PostgreSQL)

#### 1. კონვენციები

| წესი | მნიშვნელობა |
|---|---|
| Primary key | `uuid` (`gen_random_uuid()`), გარდა join ცხრილებისა |
| სახელები | `snake_case` (ბაზაშიც და API-შიც) |
| დრო | `timestamptz`, UTC. ყველა ცხრილს აქვს `created_at`, `updated_at` |
| თანხა | `integer`, **თეთრებში** (`*_minor`). ვალუტა `GEL` |
| ენები | თარგმნადი ტექსტი ინახება `*_translations` ცხრილებში (`locale` = `ka` / `en`) |
| წაშლა | პროდუქტი არ იშლება, არამედ გადადის `ARCHIVED` სტატუსში (ის შეკვეთებს სჭირდება). დანარჩენი: hard delete, სადაც ეს უსაფრთხოა |
| Snapshot | შეკვეთა ინახავს პროდუქტის სახელს, ფასს და მისამართს **შეკვეთის მომენტის მდგომარეობით**. შემდგომი ცვლილებები ძველ შეკვეთებზე არ აისახება |
| Extensions | `pgcrypto`, `pg_trgm`, `citext` |

#### 2. დომენები და კავშირები

![მონაცემთა მოდელი](../docs/diagrams/data-model.svg)

#### 3. ცხრილები

##### კატალოგი

**`categories`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid PK | |
| parent_id | uuid FK → categories, null | ხე (მაგ. „კაბელები“ → „Type 2 კაბელები“) |
| slug | text UNIQUE | URL-ისთვის; ერთი და იგივე ორივე ენისთვის (ლათინური ასოებით) |
| sort_order | int | |
| is_active | bool | |

**`category_translations`**: `(category_id, locale)` PK, `name`, `description`, `seo_title`, `seo_description`

**`products`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid PK | |
| sku | text UNIQUE | შიდა კოდი |
| slug | text UNIQUE | |
| category_id | uuid FK | |
| status | enum `DRAFT` / `ACTIVE` / `ARCHIVED` | storefront-ზე ჩანს მხოლოდ `ACTIVE` |
| price_minor | int CHECK ≥ 0 | დღგ-ის ჩათვლით |
| compare_at_price_minor | int null | „ძველი ფასი“ (გადახაზული) |
| vat_rate_bp | int default 1800 | დღგ basis points-ში (18.00%) |
| oem_part_numbers | text[] | ქარხნული ნომრები, ძებნისთვის |
| attributes | jsonb | თავისუფალი მახასიათებლები: `{ "voltage": "400V", "current": "32A", "connector": "Type 2" }` |
| weight_g | int null | მომავალში, მიწოდებისთვის |
| is_featured | bool | ჩანს მთავარ გვერდზე |
| created_at, updated_at | timestamptz | |

**`product_translations`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| product_id, locale | PK | |
| name | text | |
| short_description | text | |
| description | text | Markdown / rich text |
| seo_title, seo_description | text | |
| search_vector | tsvector GENERATED | `to_tsvector('simple', name ‖ short_description)` |

**`product_images`**: `id`, `product_id`, `storage_key`, `alt` (jsonb `{ka,en}`), `sort_order`, `width`, `height`

**`attribute_definitions`** *(სურვილისამებრ, ფილტრებისთვის)*: `key`, `label` (jsonb), `type` (`text`/`number`/`enum`), `options`, `is_filterable`. საშუალებას აძლევს ადმინს, თავად განსაზღვროს, რომელი `attributes` გამოჩნდეს ფილტრად.

##### თავსებადობა

**`charger_brands`**: `id`, `slug` UNIQUE, `name`, `logo_key`, `sort_order`, `is_active`

**`charger_models`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid PK | |
| brand_id | uuid FK | |
| slug | text | UNIQUE `(brand_id, slug)` |
| name | text | მაგ. „Wallbox Pulsar Plus“ |
| revision | text null | ვერსია / რევიზია / თაობა |
| power_kw | numeric null | |
| image_key | text null | რათა მომხმარებელმა მოდელი ვიზუალურად ამოიცნოს |
| is_active | bool | |

**`product_compatibility`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| product_id | uuid FK | PK `(product_id, charger_model_id)` |
| charger_model_id | uuid FK | |
| note | text null | მაგ. „მხოლოდ 2023 წლის შემდეგ გამოშვებულ ვერსიაზე“ |

ინდექსი: `(charger_model_id, product_id)`, რადგან ფილტრი სწორედ ამ მიმართულებით მუშაობს.

> **უნივერსალური ნაწილები** (რომლებიც ყველა მოდელს ერგება): `products.is_universal bool`. ფილტრი აბრუნებს `compatible OR universal`.

##### მარაგი (ერთი საწყობი)

**`inventory_items`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| product_id | uuid PK FK | |
| on_hand | int | ფიზიკურად არის საწყობში |
| reserved | int | დაკავებულია გადაუხდელი შეკვეთებით |
| low_stock_threshold | int default 2 | |
| | CHECK | `on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand` |

ხელმისაწვდომი რაოდენობა = `on_hand - reserved`.

**`stock_movements`** (ledger, მხოლოდ INSERT)
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid | |
| product_id | uuid | |
| type | enum `RECEIPT` / `SALE` / `RETURN` / `ADJUSTMENT` / `DAMAGE` | |
| quantity | int | + ან − |
| order_id | uuid null | |
| reason | text null | |
| actor_id | text null | ადმინის identity id |
| created_at | timestamptz | |

**`stock_reservations`**: `id`, `order_id`, `product_id`, `quantity`, `status` (`ACTIVE` / `COMMITTED` / `RELEASED`), `expires_at`, ინდექსი `(status, expires_at)`

##### მომხმარებლები

**`customers`** (Identity-ის მონაცემების ლოკალური ასლი + მაღაზიის მონაცემები)
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid | |
| identity_user_id | text UNIQUE | `sub` ტოკენიდან |
| type | enum `INDIVIDUAL` / `BUSINESS` | `BUSINESS` დაემატება მოგვიანებით |
| email | citext null | |
| phone | text null | |
| first_name, last_name | text | |
| preferred_locale | text default `ka` | |
| created_at, updated_at | | |

**`addresses`**: `id`, `customer_id`, `label`, `recipient_name`, `phone`, `city`, `address_line`, `notes`, `is_default`

> **B2B მომავლისთვის:** დაემატება `business_profiles` (`customer_id`, `company_name`, `tax_id`, `legal_address`), `price_lists` და `price_list_items`. ახლანდელი სქემა ამას არ ეწინააღმდეგება.

##### კალათა

**`carts`**: `id`, `customer_id` UNIQUE null, `guest_token` UNIQUE null, `updated_at`, `expires_at`. CHECK: ერთ-ერთი მაინც უნდა იყოს შევსებული.

**`cart_items`**: `(cart_id, product_id)` PK, `quantity` CHECK > 0, `added_at`

ფასი კალათაში **არ ინახება**: ის ყოველთვის `products`-იდან იკითხება.

##### შეკვეთები

**`orders`**
| სვეტი | ტიპი | შენიშვნა |
|---|---|---|
| id | uuid | |
| number | text UNIQUE | ადამიანისთვის წაკითხვადი: `ICM-000123` (sequence) |
| customer_id | uuid FK | |
| status | enum | იხ. [06-order-flow](../docs/06-order-flow.md#1-შეკვეთის-სტატუსები) |
| fulfillment_method | enum `PICKUP` / `DELIVERY` | `DELIVERY`-ს ადმინი ხელით მართავს |
| contact | jsonb | snapshot: სახელი, ტელეფონი, email |
| shipping_address | jsonb null | snapshot |
| subtotal_minor | int | |
| shipping_minor | int default 0 | |
| discount_minor | int default 0 | |
| total_minor | int | |
| vat_minor | int | ჯამში შემავალი დღგ |
| currency | char(3) default `GEL` | |
| locale | text | რა ენაზე გაფორმდა შეკვეთა (შეტყობინებებისთვის) |
| customer_note | text null | |
| internal_note | text null | მხოლოდ ადმინისთვის |
| placed_at, paid_at, completed_at, cancelled_at | timestamptz null | |

**`order_items`**: `id`, `order_id`, `product_id`, `sku`, `name` (jsonb `{ka,en}` snapshot), `unit_price_minor`, `quantity`, `vat_rate_bp`, `line_total_minor`

**`order_status_history`**: `id`, `order_id`, `from_status`, `to_status`, `actor_type` (`SYSTEM` / `CUSTOMER` / `ADMIN`), `actor_id`, `comment`, `created_at`

##### გადახდა და ჩეკები

**`payments`**: `id`, `order_id`, `provider` (`TBC` / `BOG`), `billing_payment_id` UNIQUE, `status` (`PENDING` / `SUCCEEDED` / `FAILED` / `EXPIRED`), `amount_minor`, `redirect_url`, `last_event` jsonb, timestamps

**`refunds`**: `id`, `payment_id`, `billing_refund_id`, `amount_minor`, `status`, `reason`, `actor_id`, timestamps

**`fiscal_receipts`**: `id`, `order_id`, `type` (`SALE` / `REFUND`), `status` (`PENDING` / `ISSUED` / `FAILED`), `external_id`, `receipt_url`, `error`, `attempts`, `issued_at`

##### ტექნიკური ცხრილები

| ცხრილი | რისთვის |
|---|---|
| `outbox_events` | `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload` jsonb, `created_at`, `published_at` null, `attempts`. ინდექსი: `WHERE published_at IS NULL` |
| `processed_events` | `(event_id, consumer)` PK, `processed_at`. Idempotent consumer |
| `failed_events` | ივენთები, რომლებმაც `max_deliver` ლიმიტი ამოწურეს |
| `idempotency_keys` | `key`, `customer_id`, `request_hash`, `response` jsonb, `created_at`. `POST /checkout`-ისთვის |
| `admin_audit_log` | `id`, `actor_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `diff` jsonb, `ip`, `created_at` |

#### 4. მნიშვნელოვანი query-ები

##### თავსებადობის ფილტრი
```sql
SELECT p.*
FROM products p
WHERE p.status = 'ACTIVE'
  AND (p.is_universal
       OR EXISTS (SELECT 1 FROM product_compatibility pc
                  WHERE pc.product_id = p.id AND pc.charger_model_id = $1));
```

##### ძებნა (ქართული + ინგლისური + SKU / OEM)
ძებნა იყენებს Postgres-ის full-text search-ს (`simple` კონფიგურაცია) და `pg_trgm`-ს (მსგავსი და შეცდომით აკრეფილი სიტყვებისთვის), ასევე ეძებს SKU-ითა და OEM ნომრით.

<details>
<summary>ტექნიკური დეტალები: ინდექსები და query</summary>

```sql
-- ინდექსები
CREATE INDEX ON product_translations USING gin (search_vector);
CREATE INDEX ON product_translations USING gin (name gin_trgm_ops);
CREATE INDEX ON products USING gin (sku gin_trgm_ops);
CREATE INDEX ON products USING gin (oem_part_numbers);

-- query (მარტივი ვერსია)
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

##### მარაგის უსაფრთხო რეზერვაცია (race condition-ის გარეშე)
```sql
UPDATE inventory_items
SET reserved = reserved + $qty, updated_at = now()
WHERE product_id = $id
  AND on_hand - reserved >= $qty
RETURNING product_id;
-- 0 row → მარაგი არ არის → მთელი checkout ტრანზაქციის rollback
```
