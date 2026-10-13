# 07 — Storefront (Next.js)

## 1. Technologies
- Next.js App Router, React Server Components
- Tailwind CSS (+ shadcn/ui for base components)
- **next-intl**: ka / en, locale in the URL
- API client: `openapi-fetch` + types generated from `icomers-api`'s `openapi.json`
- Auth: Auth.js (OIDC), BFF pattern (see [03 §1](03-integrations.md#1-identity--oauth2--oidc))
- Forms: react-hook-form + zod
- Client state: minimal. Cart item count in the header → TanStack Query

## 2. Pages (routes)

| Route | Page | Rendering |
|---|---|---|
| `/[locale]` | Home: hero, "Choose your charger", categories, featured | ISR (5 min + on-demand) |
| `/[locale]/catalog` | All products + filters | SSR (filters are in the URL) |
| `/[locale]/c/[...slug]` | Category | ISR + SSR with filters |
| `/[locale]/p/[slug]` | Product page | **ISR**, `revalidateTag('product:{id}')` |
| `/[locale]/chargers` | List of brands | ISR |
| `/[locale]/chargers/[brand]` | Brand's models | ISR |
| `/[locale]/chargers/[brand]/[model]` | Parts compatible with this model (**very important for SEO**) | ISR |
| `/[locale]/search?q=` | Search results | SSR, `noindex` |
| `/[locale]/cart` | Cart | Dynamic |
| `/[locale]/checkout` | Fulfillment method, contact details, payment method | Dynamic, login required |
| `/[locale]/checkout/result/[orderId]` | Payment result (waits for the status via SSE) | Dynamic |
| `/[locale]/account` | Profile | Dynamic, protected |
| `/[locale]/account/orders` | Orders | Dynamic |
| `/[locale]/account/orders/[id]` | Order details, status timeline, receipt | Dynamic |
| `/[locale]/account/addresses` | Addresses | Dynamic |
| `/[locale]/pages/[slug]` | Terms and conditions, privacy, return policy, delivery/pickup, contact | Static |
| `/api/auth/*` | login / callback / logout (BFF) | Route handlers |
| `/api/revalidate` | On-demand revalidation from the API (with a secret) | Route handler |
| `/sitemap.xml`, `/robots.txt` | | generated |

> ⚖️ **Legal pages** (terms, privacy, right of return) are mandatory for online commerce.

:::question id="biz-legal" to="Lawyer / Business"
Who will provide the legal texts (terms and conditions, privacy policy, return policy) in Georgian and English? By when?
:::


## 3. "My charger" (compatibility UX)

1. On the home page and in the header: **"Choose your charger"** → brand → model (with images).
2. The selected model is stored in a **cookie** (`my_charger=<modelId>`); for signed-in users it may in the future also be stored in the profile (multiple chargers).
3. When a model is selected:
   - The catalog is filtered automatically (chip: "Showing: Wallbox Pulsar Plus ✕")
   - Badge on the product card: ✅ "Fits your charger" / ⚠️ "Does not fit"
   - On the product page: the full list "Compatible with the following models"
4. If the user cannot find their model → form/link "Can't find it? Contact us".

## 4. Filters (catalog)

| Filter | UI |
|---|---|
| Charger model | Separately at the top (see §3) |
| Category | Tree / chips |
| Price | range slider |
| In stock | toggle |
| Dynamic attributes (connector, current, length...) | Checkboxes from `/catalog/filters`, with counts |
| Sorting | Popular, price ↑↓, newest |

All filters are **in the URL** (`?category=cables&in_stock=true&attr[connector]=Type+2`) so that sharing a link and navigating back work correctly.

## 5. i18n

- `ka` is the default: `/` → `/ka`.
- UI texts: `messages/ka.json`, `messages/en.json`.
- Product content comes from the API based on `Accept-Language`.
- If the English translation is missing → Georgian is shown (the fallback is on the API side).
- Price format: `Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL' })`.
- The font must support the Georgian alphabet (e.g. Noto Sans Georgian, FiraGO, the BPG series).

## 6. SEO

- `generateMetadata`: title, description, canonical, **hreflang** (`ka`, `en`, `x-default`)
- Open Graph images for products
- JSON-LD: `Product` (`offers`, `price`, `priceCurrency: GEL`, `availability`), `BreadcrumbList`, `Organization`
- `sitemap.xml`: products, categories, charger model pages, in both languages
- Pages for search and filter combinations: `noindex` or canonical pointing to the main category
- Images: `next/image`, WebP/AVIF, correct `sizes`

## 7. Caching and revalidation

![Storefront revalidation](diagrams/revalidation.svg)

- `fetch(..., { next: { tags: ['product:123'] } })` on every API call.
- **Price and stock** on the product page come from ISR, but in the cart and at checkout they are **always re-checked**.

