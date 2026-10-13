# 11 — Security

## Auth
- Tokens only in an **httpOnly, Secure, SameSite=Lax** cookie (BFF). `localStorage` is forbidden
- Nest validates the JWT: signature (JWKS), `iss`, `aud`, `exp`
- Admin endpoints: `JwtAuthGuard` + `RolesGuard` on **every** `/admin/*` route (global guard + `@Public()` exceptions)
- Session lifetime is shorter in the Admin Panel

## Data and business logic
- **Price, VAT and total are calculated only on the server**
- Quantity validation (`1..99`), stock check inside the transaction
- An order/address is visible only to its owner (`customer_id = currentUser` in every query)
- Payment status changes only from a Billing event, never from a browser redirect
- IDs are uuids; there is no public access by order number

## Web
- CSRF: SameSite cookie + Origin/Referer check on mutations in the BFF
- CORS: only our domains
- Security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`
- Product description rich text: sanitize (XSS)
- File upload: presigned URL only, content-type and size limits, images only
- Rate limiting (see [REST API §4](05-api.md#admin-sse-format), "Technical details")
- Import (CSV/XLSX): size limit, row-by-row validation, formula injection protection on export

## Service-to-service
- gRPC: mTLS or service token (see question `platform-s2s-auth`)
- NATS: dedicated user/credentials; permissions: publish only on `shop.>`, subscribe only on the required `billing.*` subjects
- `/api/revalidate`: shared secret

## Personal data
- PII: name, phone, email, address. **Not written** to logs (pino redact)
- Privacy policy + cookie consent (for analytics)
- Customer data deletion request: orders are anonymized (not fully deleted due to fiscal/accounting obligations)

## Audit
- Every admin change → `admin_audit_log` (who, what, when, diff, IP)
- Only INSERT is allowed in the audit log; records cannot be edited

## Dependencies
- `pnpm audit` / Renovate / Dependabot
- Docker image: non-root user, minimal base image, scanning (Trivy)
