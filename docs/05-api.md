# 05 — REST API

## 1. კონვენციები

| თემა | წესი |
|---|---|
| Base URL | `https://api.<domain>/v1` |
| ფორმატი | JSON, ველები **`snake_case`** (კომპანიის სხვა API-ების მსგავსად) |
| ენა | `Accept-Language: ka` / `en` (ნაგულისხმევი `ka`). თარგმნადი ველები ამ ენაზე ბრუნდება |
| Auth | `Authorization: Bearer <access_token>`. ამ header-ს Next.js-ის სერვერი ამატებს (BFF) |
| Guest კალათა | `X-Cart-Token: <uuid>` (cookie-დან BFF ამატებს) |
| თანხა | `{ "amount_minor": 15900, "currency": "GEL" }`. ფრონტი აჩვენებს როგორც `159.00 ₾` |
| თარიღი | ISO 8601, UTC |
| Pagination | `?page=1&page_size=24` → `{ items, page, page_size, total }` |
| სორტირება | `?sort=price_asc` / `price_desc` / `newest` / `relevance` |
| შეცდომა | `application/problem+json` (იხ. ქვემოთ) |
| Idempotency | `Idempotency-Key` header, `POST /checkout`-ზე სავალდებულო |
| დოკუმენტაცია | Swagger UI: `/docs` (მხოლოდ dev / staging) |
| ვერსია | URL-ში `/v1`. Breaking change → `/v2` |

### შეცდომის ფორმატი
```json
{
  "type": "https://icomers.ge/errors/out-of-stock",
  "title": "Out of stock",
  "status": 409,
  "code": "OUT_OF_STOCK",
  "detail": "ზოგიერთი პროდუქტი აღარ არის მარაგში",
  "errors": [{ "product_id": "…", "requested": 3, "available": 1 }],
  "trace_id": "4bf92f3577b34da6"
}
```
`code` მუდმივია და ფრონტი გადაწყვეტილებას მასზე დაყრდნობით იღებს. ტექსტი შეიძლება შეიცვალოს.

| HTTP | როდის |
|---|---|
| 400 / 422 | ვალიდაციის შეცდომა |
| 401 | ტოკენი არ არის ან ვადაგასულია |
| 403 | როლს არ აქვს საკმარისი უფლებები |
| 404 | ვერ მოიძებნა |
| 409 | კონფლიქტი: მარაგი, სტატუსის არასწორი ცვლილება, ფასის ცვლილება |
| 429 | ძალიან ბევრი მოთხოვნა |
| 503 | კომპანიის მიკროსერვისი (Billing / Identity) დროებით მიუწვდომელია |

---

## 2. Public (ავტორიზაციის გარეშე)

| Method | Path | აღწერა |
|---|---|---|
| GET | `/catalog/categories` | კატეგორიების ხე |
| GET | `/catalog/products` | სია + ფილტრები (იხ. ქვემოთ) |
| GET | `/catalog/products/{slug}` | დეტალები, სურათები, თავსებადი მოდელები, მარაგის სტატუსი |
| GET | `/catalog/products/{slug}/related` | მსგავსი პროდუქტები |
| GET | `/catalog/filters` | ხელმისაწვდომი ფილტრები და რაოდენობები მიმდინარე შერჩევისთვის |
| GET | `/search/suggest?q=` | autocomplete: პროდუქტები, კატეგორიები, მოდელები |
| GET | `/compatibility/brands` | დამტენის ბრენდები |
| GET | `/compatibility/brands/{brand_slug}/models` | ბრენდის მოდელები |
| GET | `/compatibility/models/{id}` | მოდელის ინფორმაცია |
| GET | `/health/live`, `/health/ready` | Kubernetes |

### `GET /catalog/products` ფილტრები
| პარამეტრი | მაგალითი |
|---|---|
| `category` | `cables` (ქვეკატეგორიებიც შედის) |
| `charger_model` | `uuid`: მხოლოდ თავსებადი + უნივერსალური |
| `charger_brand` | `wallbox` |
| `q` | ტექსტური ძებნა (სახელი, SKU, OEM ნომერი) |
| `min_price`, `max_price` | თეთრებში |
| `in_stock` | `true` |
| `attr[connector]` | `Type 2` (დინამიური ატრიბუტები) |
| `sort`, `page`, `page_size` | |

პასუხი:
```json
{
  "items": [{
    "id": "…", "slug": "type2-cable-32a-5m", "sku": "CBL-T2-32-5",
    "name": "Type 2 კაბელი 32A, 5მ",
    "price": { "amount_minor": 32900, "currency": "GEL" },
    "compare_at_price": null,
    "image": { "url": "https://cdn…/p/…/1.webp", "alt": "…" },
    "stock_status": "IN_STOCK",
    "is_compatible": true
  }],
  "page": 1, "page_size": 24, "total": 87
}
```
`stock_status`: `IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK`. ზუსტი რაოდენობა საჯაროდ არ ჩანს.

---

## 3. Customer (ავტორიზებული; კალათა login-ის გარეშეც მუშაობს)

| Method | Path | აღწერა |
|---|---|---|
| GET / PATCH | `/me` | პროფილი: სახელი, ტელეფონი, ენა |
| GET / POST | `/me/addresses` | მისამართები |
| PATCH / DELETE | `/me/addresses/{id}` | |
| GET | `/cart` | კალათა მიმდინარე ფასებით, ხელმისაწვდომობითა და ჯამით |
| POST | `/cart/items` | `{ product_id, quantity }` |
| PATCH / DELETE | `/cart/items/{product_id}` | |
| POST | `/cart/merge` | login-ის შემდეგ guest კალათის შერწყმა |
| POST | `/checkout/preview` | საბოლოო ჯამი, მარაგის შემოწმება, ფასის ცვლილებები |
| POST | `/checkout` | შეკვეთის შექმნა + გადახდის დაწყება (`Idempotency-Key`) |
| GET | `/orders` | ჩემი შეკვეთები |
| GET | `/orders/{id}` | დეტალები, სტატუსის ისტორია, ჩეკი |
| GET | `/orders/{id}/stream` | SSE: სტატუსის ცვლილება (გადახდის შედეგის გვერდისთვის) |
| POST | `/orders/{id}/cancel` | მხოლოდ `PENDING_PAYMENT` სტატუსში |
| POST | `/orders/{id}/retry-payment` | წარუმატებელი გადახდის ხელახლა ცდა |

### `POST /checkout`
Request:
```json
{
  "fulfillment_method": "PICKUP",
  "address_id": null,
  "contact": { "name": "გიორგი", "phone": "+995 5xx xx xx xx", "email": "g@example.com" },
  "payment_provider": "BOG",
  "customer_note": "",
  "expected_total_minor": 32900
}
```
`expected_total_minor`: თუ ფასი შეიცვალა მას შემდეგ, რაც მომხმარებელმა ის ნახა, ბრუნდება `409 PRICE_CHANGED` და მომხმარებელი ახალ ჯამს ხედავს.

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

## 4. Admin (`/admin/*`, საჭიროა ადმინის როლი)

### კატალოგი
| Method | Path | როლი |
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
| POST | `/admin/charger-models/{id}/products` | editor+ (ერთ მოდელზე ბევრი პროდუქტის მიბმა) |

### მარაგი
| Method | Path | როლი |
|---|---|---|
| GET | `/admin/inventory?low_stock=true` | warehouse+ |
| POST | `/admin/inventory/{product_id}/movements` | warehouse+ `{ type, quantity, reason }` |
| GET | `/admin/inventory/{product_id}/movements` | warehouse+ |

### შეკვეთები
| Method | Path | როლი |
|---|---|---|
| GET | `/admin/orders?status=&from=&to=&q=` | manager+, warehouse |
| GET | `/admin/orders/{id}` | manager+, warehouse |
| POST | `/admin/orders/{id}/transition` | manager+ / warehouse `{ to, comment }` |
| POST | `/admin/orders/{id}/cancel` | manager+ (გადახდილ შეკვეთაზე refund ავტომატურად ხდება) |
| POST | `/admin/orders/{id}/refund` | admin `{ amount_minor, reason }` |
| POST | `/admin/orders/{id}/fiscal/retry` | admin |

### სხვა
| Method | Path | როლი |
|---|---|---|
| GET | `/admin/customers`, `/admin/customers/{id}` | manager+ |
| GET | `/admin/dashboard/summary?period=today` | ყველა ადმინი |
| GET | `/admin/events/stream` | SSE, ყველა ადმინი |
| GET | `/admin/audit-log` | admin |

### Admin SSE ფორმატი
```
event: order_paid
id: 0192f3c4-…
data: {"order_id":"…","order_number":"ICM-000123","total_minor":32900}

event: inventory_low_stock
data: {"product_id":"…","sku":"CBL-T2-32-5","available":1}
```
SSE-ის წესები (reconnect, heartbeat, reconcile): იხ. [არქიტექტურა](02-architecture.md#6-sse-live-განახლებები).

<details>
<summary>ტექნიკური დეტალები: rate limiting</summary>

| Endpoint ჯგუფი | ლიმიტი |
|---|---|
| Public catalog | 120 / წთ / IP |
| `/search/suggest` | 60 / წთ / IP |
| `/checkout` | 10 / წთ / user |
| Admin | 600 / წთ / user |

პირველ ვერსიაში გამოიყენება `@nestjs/throttler`.

</details>

---

## 5. ფრონტის API client

ფრონტის კოდი API-ს გამოსაძახებლად და მისი ტიპები **ხელით არ იწერება**: ისინი backend-ის კოდიდან ავტომატურად გენერირდება.

```
NestJS კოდი  ──►  openapi.json  ──►  TypeScript ტიპები  ──►  ფრონტი
 (backend)       (API-ს აღწერა)     (ავტომატურად)          (autocomplete-ით)
```

| ნაბიჯი | ინსტრუმენტი | რას აკეთებს |
|---|---|---|
| 1 | `@nestjs/swagger` | backend-ის კოდიდან ქმნის API-ს სრულ აღწერას (`openapi.json`): ყველა URL, პარამეტრი, პასუხის ფორმა. Swagger UI-იც მასზე მუშაობს |
| 2 | `openapi-typescript` | ამ აღწერიდან ქმნის TypeScript ტიპებს |
| 3 | `openapi-fetch` | მცირე `fetch`-wrapper, რომელიც ამ ტიპებს იყენებს |

```ts
const { data } = await api.GET('/catalog/products', {
  params: { query: { category: 'cables', in_stock: true } },
});

data.items[0].price.amount_minor  // ✅ editor თავად გთავაზობს ველებს
data.items[0].prise               // ❌ შეცდომა: ასეთი ველი არ არსებობს
api.GET('/catalog/prodcts')       // ❌ შეცდომა: ასეთი URL არ არსებობს
```

**რატომ:** როცა backend-ში რაიმე იცვლება (მაგ. ფასის სტრუქტურა), ტიპები ხელახლა გენერირდება და TypeScript ფრონტში **ყველა ადგილას აჩვენებს შეცდომას**, სადაც ძველი სტრუქტურაა გამოყენებული. ფრონტისა და ბექის შეუსაბამობა ჩანს კოდის წერისას და არა მაშინ, როცა მომხმარებელი გაფუჭებულ გვერდს დაინახავს.

```bash
# icomers-api:  ქმნის openapi.json-ს (CI ავტომატურად)
pnpm openapi:export
# icomers-storefront / icomers-admin:  აგენერირებს ტიპებს
pnpm api:generate
```
