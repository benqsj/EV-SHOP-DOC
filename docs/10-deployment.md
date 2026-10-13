# 10 — Deployment (usectl)

მაღაზია ეშვება **usectl**-ზე. GitHub-ზე push-ის შემდეგ usectl თავად აწყობს image-ს, უშვებს მიგრაციებს და აახლებს აპებს. ბაზა, NATS, S3 და მონიტორინგი usectl-შივეა.

## 1. აპები

| App | რეპო | ტიპი | რას აკეთებს |
|---|---|---|---|
| `storefront` | `icomers-storefront` | web | საჯარო საიტი |
| `admin` | `icomers-admin` | web | ადმინ-პანელი |
| `api` | `icomers-api` | web | REST API + SSE |
| `worker` | `icomers-api` | worker | NATS ივენთები, outbox, ჩეკები, cron |
| `migrate` | `icomers-api` | release | ბაზის მიგრაციები, ყოველი deploy-ის წინ |

- მიგრაციები ეშვება web აპების განახლებამდე, ამიტომ ახალი კოდი ყოველთვის უკვე განახლებულ ბაზასთან მუშაობს.
- ყოველ რეპოს root-ში თავისი `Dockerfile` აქვს. `api`, `worker` და `migrate` ერთი image-იდან ეშვება, განსხვავებული ბრძანებით.

## 2. Addon-ები

| რა | რისთვის |
|---|---|
| **PostgreSQL** | მაღაზიის ბაზა |
| **NATS JetStream** | ივენთები კომპანიის სერვისებთან |
| **S3** | პროდუქტის სურათები |
| **GlitchTip** | შეცდომების მონიტორინგი (ფრონტი და ბექი) |

კავშირის მონაცემებს (`DATABASE_URL`, `NATS_URL` და ა.შ.) usectl აპებს ავტომატურად აწვდის. საიდუმლოები (client secret, session secret) ინახება protected ცვლადებად.

## 3. გარემოები

| გარემო | Branch | Billing / Fiscal |
|---|---|---|
| staging | `develop` | TBC / BOG sandbox |
| production | `main` | live |

## 4. SSE usectl-ზე

ტრაფიკის გზა: ბრაუზერი → **Cloudflare** → **Traefik** → `api`. SSE კავშირი დიდხანს რჩება ღია, ამიტომ:
- სერვერი ყოველ 15 წამში აგზავნის heartbeat-ს, რომ უმოქმედო კავშირი არ გაითიშოს.
- პასუხი არ ქეშირდება და არ ბუფერდება (`Cache-Control: no-cache`, `X-Accel-Buffering: no`).
- კავშირის გაწყვეტისას კლიენტი ხელახლა უერთდება და REST-ით ამოწმებს მონაცემებს (იხ. [SSE-ის წესები](02-architecture.md#sse-ის-წესები)).

## 5. Health და მასშტაბირება

- `/health/live`: პროცესი ცოცხალია. `/health/ready`: Postgres და NATS ხელმისაწვდომია. კომპანიის მიკროსერვისები აქ არ მოწმდება, რომ მათი დროებითი გათიშვისას კატალოგი მაინც მუშაობდეს.
- `storefront` და `api`: 2+ replica, ავტოსკალირებით. `worker`: 1–2 replica.
- გაჩერებისას (`SIGTERM`) აპი ახალ მოთხოვნებს აღარ იღებს და ასრულებს მიმდინარეს.

## 6. მონიტორინგი, ბექაპები, rollback

- **ლოგები, metrics, tracing და alert-ები** usectl-შია ჩაშენებული. Alert-ები: 5xx, ნელი პასუხები, crash loop, ჩავარდნილი ჩეკები.
- **ბექაპი:** Postgres-ის ყოველდღიური ბექაპი, 30 დღის შენახვით.
- **Rollback:** წინა ვერსიაზე დაბრუნება usectl-იდან. Rollback ბაზას უკან არ აბრუნებს, ამიტომ მიგრაციები უკუთავსებადად იწერება: ჯერ ემატება ახალი სვეტი, ძველი კი მოგვიანებით იშლება.
