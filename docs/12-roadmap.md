# 12 — Roadmap და ღია კითხვები

## ეტაპები

### ეტაპი 0 — საფუძველი
- [ ] სამი რეპო: `icomers-api`, `icomers-storefront`, `icomers-admin` (TS, ESLint, Prettier)
- [ ] docker-compose: Postgres, NATS, MinIO, Keycloak (dev)
- [ ] NestJS skeleton: config, logging, health, Prisma, OpenAPI
- [ ] Next.js storefront + admin skeleton, next-intl, Tailwind, shadcn/ui
- [ ] Auth: OIDC login (BFF) ორივე აპში, JWT guard + roles Nest-ში
- [ ] CI: lint, typecheck, test, build
- [ ] Dockerfile-ები + პირველი deploy staging-ზე (usectl)
- [ ] **proto ფაილების მიღება** Identity / Billing / Fiscal-ისთვის

### ეტაპი 1 — კატალოგი და თავსებადობა
- [ ] DB სქემა: categories, products, translations, images, attributes, charger brands/models, compatibility, inventory
- [ ] Admin: კატეგორიები, პროდუქტები (ka/en), სურათები (S3), თავსებადობა, მარაგი
- [ ] Admin: CSV/XLSX import
- [ ] API: catalog, filters, search, compatibility
- [ ] Storefront: მთავარი, კატალოგი, კატეგორია, პროდუქტი, „ჩემი დამტენი“, ძებნა
- [ ] SEO: metadata, hreflang, sitemap, JSON-LD
- [ ] ISR + on-demand revalidation

### ეტაპი 2 — კალათა, checkout, გადახდა
- [ ] კალათა (guest + user, merge)
- [ ] Checkout: preview, რეზერვაცია, idempotency
- [ ] Billing adapter (gRPC) + mock
- [ ] NATS: billing ივენთების consumer, outbox, inbox
- [ ] რეზერვაციის ვადის cron
- [ ] Storefront: checkout, შედეგის გვერდი (SSE), ანგარიში, შეკვეთები, მისამართები
- [ ] Admin: შეკვეთები, სტატუსები, გაუქმება, refund

### ეტაპი 3 — ფისკალიზაცია, live, შეტყობინებები
- [ ] Fiscal adapter + consumer, retry, FAILED მართვა
- [ ] Admin dashboard + SSE live feed
- [ ] Email/SMS შეტყობინებები (არხის გადაწყვეტის შემდეგ)
- [ ] Audit log, failed events UI

### ეტაპი 4 — გაშვებისთვის მზადება
- [ ] E2E ტესტები, race condition ტესტები, load test კატალოგზე
- [ ] Security review, headers, rate limits
- [ ] Observability: metrics, alerts, backups
- [ ] სამართლებრივი გვერდები, cookie consent, ანალიტიკა
- [ ] TBC/BOG production მონაცემები, Fiscal production
- [ ] კატალოგის შევსება (import)
- [ ] 🚀 გაშვება

### მომავალი
- B2B: კომპანიები, ფასების სიები, ინვოისით გადახდა, საიდენტიფიკაციო კოდი ჩეკზე
- კურიერულ სერვისებთან ინტეგრაცია
- პრომო-კოდები, ფასდაკლებები
- რამდენიმე საწყობი
- ERP / ბუღალტერიასთან სინქრონიზაცია
- შეფასებები, wishlist, „შემატყობინე, როცა მარაგში გამოჩნდება“
- „ჩემი დამტენები“ პროფილში

---

## ღია კითხვები

ყველა ღია კითხვა დოკუმენტაციის შესაბამის თავშია, პასუხის ველით. ქვემოთ მოცემულია მათი სრული სია და სტატუსი.

:::questions-index
:::

### ზოგადი კითხვები

:::question id="biz-catalog-source" to="ბიზნესი"
საწყისი კატალოგი სად არის ახლა (Excel, 1C, სხვა)? რა ველები აქვს (SKU, სახელი, ფასი, მარაგი, თავსებადი მოდელები, ფოტოები)? დაახლოებით რამდენი პროდუქტია?
:::

:::question id="biz-charger-models" to="ბიზნესი"
რომელი დამტენის ბრენდები და მოდელები უნდა იყოს თავსებადობის სიაში? არსებობს მზა სია?
:::

:::question id="docs-approval" to="ყველა"
დოკუმენტაციასთან დაკავშირებული შენიშვნები ან ცვლილებები, რაც დამტკიცებამდე უნდა გავითვალისწინოთ.
:::
