# 11 — Security

## Auth
- ტოკენები მხოლოდ **httpOnly, Secure, SameSite=Lax** cookie-ში (BFF). `localStorage` აკრძალულია
- Nest ამოწმებს JWT-ს: ხელმოწერა (JWKS), `iss`, `aud`, `exp`
- Admin endpoint-ები: `JwtAuthGuard` + `RolesGuard` **ყველა** `/admin/*` route-ზე (global guard + `@Public()` გამონაკლისები)
- Session-ის ხანგრძლივობა admin-ში უფრო მოკლეა

## მონაცემები და ბიზნეს-ლოგიკა
- **ფასი, დღგ, ჯამი მხოლოდ სერვერზე ითვლება**
- რაოდენობის ვალიდაცია (`1..99`), მარაგის შემოწმება ტრანზაქციაში
- შეკვეთა/მისამართი მხოლოდ მფლობელს უჩანს (ყოველ query-ში `customer_id = currentUser`)
- გადახდის სტატუსი მხოლოდ Billing-ის ივენთიდან იცვლება, არასდროს ბრაუზერის redirect-იდან
- ID-ები uuid-ია, შეკვეთის ნომრით საჯარო წვდომა არ არსებობს

## Web
- CSRF: SameSite cookie + Origin/Referer შემოწმება mutation-ებზე BFF-ში
- CORS: მხოლოდ ჩვენი domain-ები
- Security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`
- პროდუქტის აღწერის rich text: sanitize (XSS)
- ფაილის ატვირთვა: მხოლოდ presigned URL, content-type და ზომის ლიმიტი, მხოლოდ სურათები
- Rate limiting (იხ. [05 §5](05-api.md#5-rate-limiting-საწყისი))
- Import (CSV/XLSX): ზომის ლიმიტი, ვალიდაცია ხაზ-ხაზ, formula injection-ისგან დაცვა export-ში

## Service-to-service
- gRPC: mTLS ან service token (იხ. კითხვა `platform-s2s-auth`)
- NATS: საკუთარი user/credentials, უფლება მხოლოდ `shop.>`-ზე publish-ისთვის და საჭირო `billing.*`-ზე subscribe-ისთვის
- `/api/revalidate`: shared secret

## პერსონალური მონაცემები
- PII: სახელი, ტელეფონი, email, მისამართი. ლოგებში **არ იწერება** (pino redact)
- კონფიდენციალურობის პოლიტიკა + cookie consent (ანალიტიკისთვის)
- მომხმარებლის მონაცემების წაშლის მოთხოვნა: შეკვეთები ანონიმიზდება (ფისკალური/ბუღალტრული ვალდებულებების გამო მთლიანად არ იშლება)

## Audit
- Admin-ის ყველა ცვლილება → `admin_audit_log` (ვინ, რა, როდის, diff, IP)
- Audit log მხოლოდ INSERT-ია, რედაქტირება შეუძლებელია

## Dependencies
- `pnpm audit` / Renovate / Dependabot
- Docker image: non-root user, მინიმალური base image, სკანირება (Trivy)
