# 12 — Roadmap and Open Questions

## Phases

### Phase 0 — Foundation
- [ ] Three repos: `icomers-api`, `icomers-storefront`, `icomers-admin` (TS, ESLint, Prettier)
- [ ] docker-compose: Postgres, NATS, MinIO
- [ ] NestJS skeleton: config, logging, health, Prisma, OpenAPI
- [ ] Next.js storefront + admin skeleton, next-intl, Tailwind, shadcn/ui
- [ ] Auth: OIDC login (BFF) in both apps, JWT guard + roles in Nest
- [ ] CI: lint, typecheck, test, build
- [ ] Dockerfiles + first deploy to staging (usectl)
- [ ] **Obtain the proto files** for Identity / Billing / Fiscal

### Phase 1 — Catalog and compatibility
- [ ] DB schema: categories, products, translations, images, attributes, charger brands/models, compatibility, inventory
- [ ] Admin: categories, products (ka/en), images (S3), compatibility, stock
- [ ] Admin: CSV/XLSX import
- [ ] API: catalog, filters, search, compatibility
- [ ] Storefront: home, catalog, category, product, "My charger", search
- [ ] SEO: metadata, hreflang, sitemap, JSON-LD
- [ ] ISR + on-demand revalidation

### Phase 2 — Cart, checkout, payment
- [ ] Cart (guest + user, merge)
- [ ] Checkout: preview, reservation, idempotency
- [ ] Billing adapter (gRPC) + mock
- [ ] NATS: Billing event consumer, outbox, inbox
- [ ] Reservation expiry cron
- [ ] Storefront: checkout, result page (SSE), account, orders, addresses
- [ ] Admin: orders, statuses, cancellation, refund

### Phase 3 — Fiscalization, live, notifications
- [ ] Fiscal adapter + consumer, retry, FAILED status handling
- [ ] Admin dashboard + SSE live feed
- [ ] Email notifications
- [ ] Audit log, failed events UI

### Phase 4 — Launch readiness
- [ ] E2E tests, race condition tests, load test on the catalog
- [ ] Security review, headers, rate limits
- [ ] Observability: metrics, alerts, backups
- [ ] Legal pages, cookie consent, analytics
- [ ] TBC/BOG production credentials, Fiscal production
- [ ] Catalog population (import)
- [ ] 🚀 Launch

### Future
- B2B: companies, price lists, payment by invoice, company identification code on the receipt
- Integration with courier services
- Promo codes, discounts
- Multiple warehouses
- Synchronization with ERP / accounting
- Reviews, wishlist, "Notify me when back in stock"
- "My chargers" in the profile

---

## Open questions

Every open question lives in the relevant chapter of the documentation, together with an answer field. Below is the full list with their status.

:::questions-index
:::

