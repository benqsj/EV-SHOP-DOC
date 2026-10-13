# 09 — Repo სტრუქტურა და დეველოპმენტი

## 1. რეპოზიტორიები

კოდი იყოფა **სამ ცალკე რეპოდ**. თითოეულს თავისი Dockerfile, CI და deploy აქვს.

| რეპო | რა არის | usectl აპები |
|---|---|---|
| `icomers-api` | NestJS: REST API, worker, მიგრაციები | `api`, `worker`, `migrate` |
| `icomers-storefront` | Next.js: საჯარო საიტი | `storefront` |
| `icomers-admin` | Next.js: ადმინ-პანელი | `admin` |

### `icomers-api`
```
icomers-api/
├─ src/
│  ├─ modules/            # catalog, cart, orders, payments, … (იხ. არქიტექტურა)
│  ├─ infra/              # prisma, nats, outbox, grpc, storage
│  ├─ contracts/          # NATS ივენთების სქემები (zod)
│  ├─ main.ts             # HTTP API
│  └─ worker.ts           # Worker
├─ proto/                 # კომპანიის სერვისების .proto კონტრაქტები + გენერირებული კოდი
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts             # სატესტო კატალოგი, ბრენდები, მოდელები
├─ openapi.json           # API-ს აღწერა (CI განაახლებს); ფრონტები მისგან აგენერირებენ client-ს
├─ docker-compose.yml     # ლოკალური ინფრასტრუქტურა
├─ Dockerfile
└─ .env.example
```

### `icomers-storefront` და `icomers-admin`
```
icomers-storefront/
├─ src/
│  ├─ app/                # Next.js გვერდები
│  ├─ components/
│  ├─ api/schema.ts       # API-ს ტიპები, გენერირებული openapi.json-იდან
│  └─ messages/           # ka.json, en.json
├─ Dockerfile
└─ .env.example
```
ადმინს იგივე სტრუქტურა აქვს.

### როგორ იღებს ფრონტი API-ს ტიპებს
`icomers-api`-ის CI ყოველი ცვლილებისას განაახლებს `openapi.json`-ს. ფრონტის რეპოში ერთი ბრძანება აგენერირებს ტიპებს:
```bash
pnpm api:generate   # openapi-typescript <api-ს openapi.json> -o src/api/schema.ts
```
წყარო შეიძლება იყოს ლოკალური API (`http://localhost:4000/docs-json`) ან staging. თუ backend-ში რამე შეიცვალა, ტიპების განახლების შემდეგ TypeScript ფრონტში ყველა შეუსაბამო ადგილს აჩვენებს.

## 2. ლოკალური გარემო

`icomers-api`-ის `docker-compose.yml` უშვებს ინფრასტრუქტურას. აპები ლოკალურად ეშვება `pnpm dev`-ით, თითოეული თავის რეპოში:

| სერვისი | Image | Port |
|---|---|---|
| postgres | `postgres:16` | 5432 |
| nats | `nats:2` (`-js` JetStream-ით) | 4222, 8222 (monitoring) |
| minio | `minio/minio` (ლოკალური S3) | 9000, 9001 (console) |
| mailpit | `axllent/mailpit` (email-ის ტესტირება) | 1025, 8025 |

Identity, Billing და Fiscal სერვისებთან დეველოპმენტისას კომპანიის dev გარემო გამოიყენება.

## 3. კონფიგურაცია და კოდის წესები

<details>
<summary>Environment ცვლადები</summary>

| ცვლადი | მაგალითი |
|---|---|
| `DATABASE_URL` | `postgresql://icomers:icomers@localhost:5432/icomers` |
| `NATS_URL` | `nats://localhost:4222` |
| `OIDC_ISSUER` | `https://id.example.ge/realms/main` |
| `OIDC_AUDIENCE` | `icomers-api` |
| `GRPC_BILLING_URL` / `GRPC_FISCAL_URL` / `GRPC_IDENTITY_URL` | `billing:50051` |
| `PAYMENT_GATEWAY` / `FISCAL_GATEWAY` | `grpc` / `mock` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL` | |
| `RESERVATION_TTL_MINUTES` | `15` |
| `STOREFRONT_URL`, `STOREFRONT_REVALIDATE_SECRET` | |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` |
| `LOG_LEVEL` | `info` |

Next.js აპებისთვის: `API_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`.

Config ვალიდირდება გაშვებისას (zod / `@nestjs/config`). არასწორი config-ის შემთხვევაში აპი არ გაეშვება.

</details>

<details>
<summary>კოდის წესები</summary>

- TypeScript `strict: true`
- ESLint + Prettier, `lint-staged` + `husky` pre-commit
- Conventional Commits (`feat:`, `fix:`, `docs:`...)
- ბიზნეს-ლოგიკა service-ებშია, controller-ები თხელია
- ყველა DTO აღწერილია `@nestjs/swagger` დეკორატორებით, რომ OpenAPI სრული იყოს
- ფული ინახება მხოლოდ `*_minor` integer-ებით; ფორმატირება ხდება ერთი დამხმარე ფუნქციით

</details>

## 4. ტესტები

| დონე | ინსტრუმენტი | რას ვტესტავთ |
|---|---|---|
| Unit | Vitest / Jest | ფასის გამოთვლა, დღგ, state machine, ვალიდაცია |
| Integration | Jest + **Testcontainers** (Postgres, NATS) | checkout ტრანზაქცია, მარაგის race condition (პარალელური request-ები), outbox relay, idempotent consumers |
| Contract | gRPC mock სერვერები | Billing/Fiscal adapter-ები |
| E2E | **Playwright** | კატალოგი → კალათა → checkout → (mock) გადახდა → შეკვეთა PAID; admin: სტატუსის შეცვლა |

**სავალდებულო ტესტი:** 10 პარალელური checkout ერთსა და იმავე ბოლო ერთეულზე → წარმატებით მხოლოდ 1 უნდა დასრულდეს.

## 5. CI

ყოველ რეპოს საკუთარი CI აქვს:

| ეტაპი | რა მოწმდება |
|---|---|
| Pull request | lint, typecheck, ტესტები, build. `icomers-api`-ში დამატებით: Prisma სქემის შემოწმება და OpenAPI-ის breaking change-ებზე გაფრთხილება |
| Merge `develop`-ში | usectl ავტომატურად აწყობს და აახლებს staging-ს |
| Merge `main`-ში | production |
