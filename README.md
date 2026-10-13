# icomers — ონლაინ მაღაზია

კომპანიის **საკუთარი პროდუქციის** ონლაინ მაღაზია (ელექტრომობილის დამტენების ნაწილები, აქსესუარები და ა.შ.).
გამყიდველი მხოლოდ ერთია, კომპანია თავად. ეს **marketplace არ არის**.

> სტატუსი: **დოკუმენტაციის / დაგეგმვის ეტაპი.** კოდი ჯერ არ არსებობს.

## Stack მოკლედ

| ფენა | ტექნოლოგია |
|---|---|
| Storefront | Next.js (App Router) + TypeScript + next-intl (ka/en) |
| Admin panel | Next.js (ცალკე აპი) + shadcn/ui + TanStack Query/Table |
| Backend | NestJS (REST + OpenAPI), ცალკე worker პროცესი |
| Database | PostgreSQL + Prisma |
| Messaging | NATS JetStream (+ Outbox pattern) |
| შიდა სერვისები | gRPC: Identity, Billing, Fiscal (Notification — მოგვიანებით) |
| Real-time admin | SSE (Server-Sent Events) |
| ფაილები | S3 (usectl addon) |
| რეპოები | 3 ცალკე რეპო: api, storefront, admin |
| Deploy | usectl (Kubernetes) |

## დოკუმენტაცია

**გახსნა:** ორჯერ დააწკაპუნეთ `index.html`-ზე. ის ბრაუზერში იხსნება სარჩევით, დიაგრამებით და კითხვებზე პასუხის ველებით. დოკუმენტაცია ორ ენაზეა (ზემოთ გადამრთველი **KA / EN**): ქართული `docs/*.md`, ინგლისური `docs/en/*.md`.

- წყარო არის `docs/*.md`, `docs/en/*.md` და `docs/diagrams/` (ინგლისური დიაგრამები `docs/diagrams/en/`-ში). ცვლილების შემდეგ `index.html` თავიდან იწყობა: `node docs-site/build.mjs`
- ჰოსტინგი (პასუხები და დამატებები ყველასთვის საერთოა, ინახება Postgres-ში): `Dockerfile` რეპოს root-შია. დეტალები: [docs-site/README.md](docs-site/README.md)

| # | ფაილი | შინაარსი |
|---|---|---|
| 00 | [Overview](docs/00-overview.md) | მიზანი, scope, როლები, მოთხოვნები, ტერმინები |
| 01 | [Tech Stack](docs/01-tech-stack.md) | Stack, პლიუსები/მინუსები, მიღებული გადაწყვეტილებები |
| 02 | [Architecture](docs/02-architecture.md) | სისტემის სქემა, მოდულები, sync/async წესები, Outbox, SSE |
| 03 | [Integrations](docs/03-integrations.md) | Identity (OAuth2/OIDC), Billing, Fiscal, Notification, NATS |
| 04 | [Data Model](docs/04-data-model.md) | Postgres სქემა, ცხრილები, ინდექსები, თავსებადობა |
| 05 | [REST API](docs/05-api.md) | კონვენციები, endpoint-ები (public / customer / admin) |
| 06 | [Order Flow](docs/06-order-flow.md) | Checkout, მარაგის რეზერვაცია, გადახდა, ფისკალური ჩეკი, refund |
| 07 | [Storefront](docs/07-storefront.md) | გვერდები, i18n, SEO, ფილტრები, rendering სტრატეგია |
| 08 | [Admin Panel](docs/08-admin-panel.md) | მოდულები, როლები და უფლებები, live dashboard |
| 09 | [Repo & Dev](docs/09-repo-and-dev.md) | რეპოები, ლოკალური გარემო, ტესტები, CI |
| 10 | [Deployment](docs/10-deployment.md) | usectl: აპები, addon-ები, domain-ები, გარემოები, მონიტორინგი |
| 11 | [Security](docs/11-security.md) | უსაფრთხოების წესები |
| 12 | [Roadmap & Open Questions](docs/12-roadmap.md) | ეტაპები და ღია კითხვები |
