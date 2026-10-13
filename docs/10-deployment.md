# 10 — Deployment (usectl)

მაღაზია ეშვება **usectl**-ზე. GitHub-ზე push-ის შემდეგ usectl თავად აწყობს image-ს, უშვებს მიგრაციებს და აახლებს აპებს. ბაზა, NATS, S3, domain-ები და მონიტორინგი usectl-შივეა.

## 1. აპები

ყველა აპი ერთ usectl **Machine**-შია (`icomers`). თითოეული აპი თავისი რეპოდან ეშვება.

| App | რეპო | ტიპი (kind) | რას აკეთებს | Port | Domain |
|---|---|---|---|---|---|
| `storefront` | `icomers-storefront` | `web` | საჯარო საიტი | 3000 | `shop.<domain>` |
| `admin` | `icomers-admin` | `web` | ადმინ-პანელი | 3001 | `admin.<domain>` |
| `api` | `icomers-api` | `web` | REST API + SSE | 4000 | `api.<domain>` |
| `worker` | `icomers-api` | `worker` | NATS ივენთები, outbox, ჩეკები, cron | — | — (`--private`) |
| `migrate` | `icomers-api` | `release` | `prisma migrate deploy`, ყოველი deploy-ის წინ | — | — |

- **`release`** აპი ყოველ deploy-ზე **web აპების განახლებამდე** ეშვება. ამიტომ ახალი კოდი ყოველთვის განახლებულ ბაზას ხვდება.
- **`worker`**-ს HTTP ტრაფიკი არ აქვს და domain არ სჭირდება.
- Deploy ავტომატურია GitHub push-ზე (`--auto-deploy`). ხელით: `usectl machines deploy icomers`.

## 2. Dockerfile-ები

ყოველ რეპოს root-ში თავისი `Dockerfile` აქვს, და usectl მას ავტომატურად იყენებს.

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

## 3. Addon-ები

| რა | usectl addon | აპს ავტომატურად ეძლევა |
|---|---|---|
| **PostgreSQL** | Postgres. Production-ში `dedicated`, ავტომატური ბექაპით | `DATABASE_URL` |
| **NATS JetStream** | Billing-ის NATS-თან კავშირი (იხ. კითხვა `platform-company-services`). JetStream მხოლოდ `dedicated` NATS-ზე მუშაობს | `NATS_URL`, `NATS_USER`, `NATS_PASSWORD` |
| **S3** | S3 addon (managed). პროდუქტის სურათებისთვის public CDN | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` |
| **შეცდომები** | GlitchTip (Sentry-თავსებადი) | `SENTRY_DSN` |

- addon თითოეულ აპზე ცალკე უნდა მიება (`attach-addon`). `DATABASE_URL` სჭირდება `api`-ს, `worker`-ს და `migrate`-ს.
- addon-ის ცვლადები ხელით არ იწერება.
- S3 client-ში საჭიროა `forcePathStyle: true`.

## 4. SSE usectl-ზე

ტრაფიკის გზა: ბრაუზერი → **Cloudflare** → **Traefik** → `api`. SSE კავშირი დიდხანს რჩება ღია. მის შესანარჩუნებლად:
- სერვერი ყოველ 15 წამში აგზავნის heartbeat-ს. Cloudflare უმოქმედო კავშირს ~100 წამში თიშავს, და heartbeat ამას აცილებს.
- პასუხს აქვს `Cache-Control: no-cache` და `X-Accel-Buffering: no`.
- კავშირის გაწყვეტისას კლიენტი ხელახლა უერთდება და REST-ით ამოწმებს მონაცემებს (იხ. [SSE-ის წესები](02-architecture.md#sse-ის-წესები)).

usectl-ის დოკუმენტაცია SSE-ს ცალკე არ აღწერს, ამიტომ staging-ზე შემოწმდება (კითხვა `usectl-sse`).

## 5. Env ცვლადები და secrets

- **Machine-ის დონეზე** საერთო ცვლადები (მაგ. `OIDC_ISSUER`), **აპის დონეზე** კი მხოლოდ ერთი აპის ცვლადები (მაგ. `API_URL` ფრონტებისთვის).
- საიდუმლოები (`OIDC_CLIENT_SECRET`, `SESSION_SECRET`) მონიშნულია **protected**-ად: მათი წაკითხვა შეუძლებელია, მხოლოდ ჩაწერა.
- `NEXT_PUBLIC_*` ცვლადები Next.js-ს build-ის დროს სჭირდება: `usectl vars expose … --build-target build_arg`.
- ცვლადის შეცვლა ახალ deploy-ს მოითხოვს.

ცვლადების სრული სია: [Repo & Dev](09-repo-and-dev.md#3-კონფიგურაცია-და-კოდის-წესები).

## 6. Domain-ები

DNS-ში `CNAME → custom.usectl.com`, შემდეგ `usectl domains verify` და `attach-app` შესაბამის აპზე. TLS სერტიფიკატს Cloudflare ავტომატურად გასცემს.

`*.usectl.com` მისამართზე (staging-ისთვის) გამოიყენება მხოლოდ **ერთდონიანი** სახელი, მაგ. `icomers-api.usectl.com`. `api.icomers.usectl.com`-ის მსგავსი მრავალდონიანი სახელისთვის Cloudflare სერტიფიკატს ვერ გასცემს, და ბრაუზერი აჩვენებს `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`-ს.

## 7. გარემოები

| გარემო | სად | Branch | Billing / Fiscal |
|---|---|---|---|
| local | docker-compose | — | mock |
| staging | Machine group `stage` (ცალკე namespace და ცალკე addon-ები) | `develop` | TBC / BOG sandbox, test |
| production | Machine `icomers` | `main` | live |

PR preview გარემოები თავიდან გამორთულია: ისინი მშობლის ბაზას იზიარებენ და მიგრაციებმა შეიძლება staging-ის ბაზა შეცვალონ.

## 8. Health და მასშტაბირება

| Endpoint | რას ამოწმებს |
|---|---|
| `/health/live` | პროცესი ცოცხალია |
| `/health/ready` | Postgres და NATS კავშირი. კომპანიის მიკროსერვისები არ მოწმდება, რომ მათი დროებითი გათიშვისას კატალოგი მაინც მუშაობდეს |

- `storefront` და `api`: 2+ replica, ავტოსკალირება (usectl მხოლოდ web აპებს ასკალირებს).
- `worker`: 1–2 replica. Outbox რამდენიმე replica-ზეც უსაფრთხოდ მუშაობს.
- `SIGTERM`-ზე აპი ახალ მოთხოვნებს აღარ იღებს, ხურავს SSE კავშირებს და ასრულებს მიმდინარე ივენთებს.

## 9. მონიტორინგი

ყველაფერი usectl-შია ჩაშენებული:

| რა | სად |
|---|---|
| ლოგები | Loki: `usectl machines logs icomers api -f` |
| Metrics | მოთხოვნები, p95, 5xx, CPU და მეხსიერება. ჩვენი `/metrics` (outbox backlog, failed events) usectl-ის მხარდაჭერის ჩართვის შემდეგ |
| Tracing | OpenTelemetry → Tempo (HTTP, gRPC და NATS) |
| შეცდომები | GlitchTip (`SENTRY_DSN`), ფრონტიც და ბექიც |
| Alert-ები | Slack ან webhook (email არ მუშაობს): 5xx %, p95, crash loop, OOM, ჩავარდნილი ჩეკები |

## 10. ბექაპები და rollback

- **Postgres:** `dedicated` addon-ზე ყოველდღიური `pg_dump`, 30 დღის შენახვით.
- **Rollback:** `usectl machines rollback icomers <deployment>`, ან ავტომატური, თუ deploy-ის შემდეგ 5xx გაიზარდა. Rollback ბაზას უკან არ აბრუნებს, ამიტომ მიგრაციები ყოველთვის უკუთავსებადად იწერება: ჯერ ემატება ახალი სვეტი, ძველი კი მოგვიანებით იშლება.

## 11. Platform-თან დასაზუსტებელი

:::question id="platform-company-services" to="Platform / Backend გუნდი"
Billing, Fiscal და Identity usectl-ზეა? usectl-ის Machine-ები ერთმანეთისგან იზოლირებულია და შიდა IP-ებზე წვდომა დაბლოკილია. როგორ მივწვდეთ ამ სერვისებს gRPC-ით და Billing-ის NATS-ს (მაგ. addon-ის გაზიარებით, `--shared-from`)?
:::

:::question id="usectl-sse" to="Platform (usectl)"
SSE (დიდხანს ღია HTTP კავშირი, heartbeat ყოველ 15 წამში) Cloudflare-სა და Traefik-ზე შეზღუდვის გარეშე მუშაობს? როგორ კონფიგურირდება health check-ების path და port?
:::

:::question id="platform-envs" to="Platform / ბიზნესი"
რა domain-ები გამოვიყენოთ (`shop.…`, `admin.…`, `api.…`)? Staging-ისთვის Machine group `stage` გამოდგება, თუ ცალკე Machine ჯობია? Production-ის ბაზისთვის ყოველდღიური ბექაპი საკმარისია?
:::
