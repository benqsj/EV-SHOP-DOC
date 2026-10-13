# 06 — Order Flow (Checkout, Payment, Receipt)

## 1. Order statuses

![Order statuses](diagrams/order-states.svg)

- Allowed transitions are defined in **one place** (`orders/order-state-machine.ts`). Any other transition → `409 INVALID_TRANSITION`.
- Every transition is written to `order_status_history` and to the outbox (`shop.order.status_changed`).

## 2. Checkout — step by step

![Checkout and payment](diagrams/checkout.svg)

### Important details
1. **The price is always calculated on the server.** A price sent by the client is never used. `expected_total_minor` is only for comparison.
2. **The reservation happens in a transaction.** If stock is insufficient for any line, the entire transaction is rolled back → `409 OUT_OF_STOCK` with details.
3. **If `CreatePayment` fails** (Billing is unavailable): the order stays in `PENDING_PAYMENT` and the customer sees "Try again" (`retry-payment`). The reservation remains valid until it expires.
4. **Idempotency-Key:** a second request with the same key (double click, refresh) returns the same response and does not create a new order.
5. **The return page** does not trust URL parameters ("success=true"). It gets the status from our API: first via REST, then it waits for the change via SSE. On reconnect, it checks the status via REST again.

## 3. Reservation expiry

- `RESERVATION_TTL` = 15 minutes (configurable; should be slightly longer than Billing's payment timeout).
- Worker cron, every minute:
  ```sql
  SELECT ... FROM stock_reservations
  WHERE status = 'ACTIVE' AND expires_at < now()
  FOR UPDATE SKIP LOCKED
  ```
  → `reserved -= qty`, reservation → `RELEASED`, order → `CANCELLED` (reason: `PAYMENT_TIMEOUT`).

### Edge case: payment arrives after the reservation has expired
1. If the stock is still available → the order is restored and becomes `PAID` (the normal path).
2. If the stock is no longer available → the order becomes `PAID` but is flagged as `needs_attention`. The admin receives an alert via SSE and decides whether to wait for stock or refund the money.

## 4. Cancellation and Refund

![Cancellation and Refund](diagrams/refund.svg)

- Stock is returned automatically only if the item has not yet been handed over (`PAID` / `PROCESSING`). For a return after `COMPLETED`, the admin inspects the item and then manually records a `RETURN` movement.
- Partial refund: only with the admin role and only if Billing supports it.

## 5. Fiscal receipt

| Situation | Action |
|---|---|
| `shop.order.paid` | `IssueReceipt` (SALE) |
| `shop.order.refunded` | `IssueRefundReceipt` (REFUND) |
| Fiscal is unavailable | JetStream retry with backoff |
| `max_deliver` exhausted | `fiscal_receipts.status = FAILED`, an alert is sent to the admin, a "Retry" button appears |

When the receipt is issued (at payment or at handover) depends on the answer to the `fiscal-when` question, see [03 §3](03-integrations.md#3-fiscal--rsge).

## 6. Customer notifications

Notifications are sent by email, in the language of the order (`orders.locale`).

| Event | Notification |
|---|---|
| `shop.order.paid` | "Order ICM-000123 has been received" + receipt link |
| `status_changed → READY_FOR_PICKUP` | "Your order is ready for pickup" + address/opening hours |
| `status_changed → SHIPPED` | "Your order is on its way" |
| `shop.order.cancelled` | "Your order has been cancelled; the money will be refunded to your card" |
