# 01 — Tech Stack

> ყველა გადაწყვეტილება ამ დოკუმენტის დამტკიცებამდე **შემოთავაზებულია**.

## 1. ტექნოლოგიები

| ფენა | ტექნოლოგია | რატომ |
|---|---|---|
| ენა | **TypeScript** (Node.js 24 LTS) | ერთი ენა ფრონტსა და ბექზე, საერთო ტიპები |
| Storefront | **Next.js** (App Router), Tailwind CSS, next-intl | SEO: გვერდები სერვერზე რენდერდება; ISR: კატალოგი cache-დან იხსნება და პროდუქტის შეცვლისას ახლდება; ka / en |
| Admin Panel | **Next.js**, shadcn/ui, TanStack Query + Table | იგივე ტექნოლოგია, რაც storefront-ში; მზა ცხრილები, ფორმები და cache |
| Backend | **NestJS** | gRPC client ჩაშენებულია; მოდულები და DI მკაფიო სტრუქტურას იძლევა; `@nestjs/swagger`-ით OpenAPI ავტომატურად გენერირდება |
| Worker | იგივე NestJS კოდი, ცალკე პროცესი | ფონური სამუშაო (ივენთები, ჩეკები, cron) HTTP API-ს არ ანელებს |
| API | **REST + OpenAPI**, ველები `snake_case` | ნაცნობი მიდგომაა; Swagger UI ტესტირებისთვის; კომპანიის სხვა API-ების კონვენცია |
| API client | **openapi-typescript + openapi-fetch** | ფრონტის ტიპები backend-ის კოდიდან გენერირდება, ხელით არ იწერება (იხ. [REST API](05-api.md#5-ფრონტის-api-client)) |
| Database | **PostgreSQL 16+** | ტრანზაქციები (შეკვეთა + მარაგი ერთად); JSONB მახასიათებლებისთვის; full-text search და `pg_trgm` |
| ORM | **Prisma** | ტიპიზებული client, მიგრაციები, Prisma Studio; საჭიროებისას raw SQL |
| gRPC | `@grpc/grpc-js` + Buf + ts-proto | `.proto` კონტრაქტიდან TypeScript client-ები |
| Messaging | **NATS JetStream** (nats.js) | კომპანიის სერვისები უკვე იყენებს (Billing); ივენთები ინახება და არ იკარგება; dedupe და retry |
| Real-time | **SSE** | გვჭირდება მხოლოდ სერვერი → ბრაუზერი მიმართულება; მუშაობს ჩვეულებრივ HTTP-ზე |
| ფაილები | S3 (usectl-ის S3 addon) | პროდუქტის სურათები, ატვირთვა პირდაპირ ადმინიდან (presigned URL) |
| რეპოები | 3 ცალკე რეპო (api, storefront, admin), pnpm | კომპანიის სტილი; დამოუკიდებელი deploy; ტიპები OpenAPI-დან გენერირდება ([Repo & Dev](09-repo-and-dev.md#1-რეპოზიტორიები)) |
| ტესტები | Vitest / Jest, Testcontainers, Playwright | რეალური Postgres და NATS ტესტებში; E2E ბრაუზერში |
| Deploy | **usectl** (Kubernetes) | push-to-deploy, Postgres / NATS / S3 addon-ები, domain-ები, ლოგები და alert-ები ერთ ადგილას |

**Redis პირველ ვერსიაში არ გვჭირდება.** კალათა Postgres-ში ინახება, queue-ს როლს NATS ასრულებს, cache-ს კი Next.js. საჭიროებისას მოგვიანებით დაემატება.

## 2. ძირითადი გადაწყვეტილებები

| # | გადაწყვეტილება | მიზეზი |
|---|---|---|
| D1 | Shop backend არის **modular monolith**: ერთი NestJS აპი, შიგნით მოდულებად დაყოფილი | მაღაზიის დომენი ერთიანია; შეკვეთა და მარაგი ერთ ტრანზაქციაში; მარტივი deploy. მოდული საჭიროებისას ცალკე სერვისად შეიძლება გამოიყოს ([არქიტექტურა](02-architecture.md#3-nestjs-მოდულები-modular-monolith)) |
| D2 | ფრონტი მხოლოდ REST-სა და SSE-ს იყენებს; gRPC და NATS მხოლოდ backend-შია | ფრონტი შიდა სისტემებზე არ არის დამოკიდებული |
| D3 | ავტორიზაცია: Identity (OAuth2 / OIDC), ტოკენები httpOnly cookie-ში (BFF) | ტოკენი JavaScript-ში არ ჩანს; SSE მარტივად მუშაობს ([ინტეგრაციები](03-integrations.md#1-identity--oauth2--oidc)) |
| D4 | ასინქრონული პროცესები: NATS JetStream + Outbox pattern | ივენთი არ იკარგება, თუნდაც სერვისი დროებით გაითიშოს |
| D5 | API-ში და ივენთებში ველები `snake_case` | კომპანიის სხვა სერვისებთან ერთიანი სტილი |
| D6 | ფასები მთელ რიცხვად, თეთრებში | დამრგვალების შეცდომების გარეშე |

## 3. განხილული ალტერნატივები

| ალტერნატივა | რატომ არ შევარჩიეთ |
|---|---|
| **Drizzle** (ORM) | Prisma-ს ინსტრუმენტები (Studio, მიგრაციები) ამ პროექტისთვის უფრო მოსახერხებელია |
| **Shop-ის დაყოფა რამდენიმე მიკროსერვისად** | შეკვეთა და მარაგი ერთ ტრანზაქციაში უნდა იყოს; დაყოფა saga-ს და ზედმეტ ინფრასტრუქტურას მოითხოვს. საჭიროებისას დაყოფა მოგვიანებით შესაძლებელია |
