# Architectural Blueprint (V1)

**Goal:** Scalable Event Ticketing SaaS
**Status:** Approved for Implementation

## 1. Database Schema Extensions

We need to introduce new entities to support Commerce and Advanced Event Management.

### 1.1 New Core Tables

**`orders`**
*   *Purpose:* Aggregates purchases.
*   *Columns:* `id`, `public_id` (UUID), `event_id`, `user_id` (nullable for guest checkout), `total_amount`, `tax_amount`, `fee_amount`, `status` (pending, paid, failed, refunded), `stripe_payment_intent_id`, `created_at`.

**`order_items`**
*   *Purpose:* Links specific tickets/products to an order.
*   *Columns:* `id`, `order_id`, `item_type` (ticket_type, donation, add-on), `item_id`, `quantity`, `price_at_booking`, `metadata` (JSON for custom form answers).

**`attendees`**
*   *Purpose:* Separates the "Buyer" from the "Holder" of the ticket.
*   *Columns:* `id`, `ticket_id`, `first_name`, `last_name`, `email`, `checkin_status`, `answers` (JSON for custom questions).

**`stripe_accounts`** (for Stripe Connect)
*   *Purpose:* Stores organizer payout details.
*   *Columns:* `id`, `user_id`, `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `details_submitted`.

### 1.2 Updates to Existing Tables

*   **`events`**: Add `slug` (for public URLs), `settings` (JSON for toggleable features like offline_mode, tax_rate), `description_html` (for WYSIWYG editor).
*   **`tickets`**: Add `order_id` (foreign key), `qr_code_hash` (for offline validation security).
*   **`users`**: Add `stripe_customer_id` (for buyers).

## 2. Stripe Integration Strategy: Connect Standard

We will implement **Stripe Connect Standard**.

*   **Rationale:**
    *   **Liability:** Standard accounts are their own legal entities. We (the platform) are not responsible for refunds or chargebacks directly.
    *   **Speed:** Organizers onboard themselves via Stripe's hosted flow.
    *   **Monetization:** We can take an "Application Fee" on every transaction easily.

*   **Flow:**
    1.  Organizer clicks "Connect Stripe" in Dashboard.
    2.  Redirected to Stripe OAuth.
    3.  Redirected back with `authorization_code`.
    4.  We exchange code for `stripe_account_id` and store in `stripe_accounts`.

*   **Checkout:**
    *   We use Stripe Elements on the frontend.
    *   Backend creates a `PaymentIntent` with `application_fee_amount`.
    *   Funds go directly to the Organizer's Stripe account, minus our fee.

## 3. Offline Sync Strategy (QR Check-in)

The "Scanner App" needs to work in a basement with no signal.

**Architecture:** "Optimistic Local-First"

1.  **Data Store:** Browser `IndexedDB` (via a wrapper like `idb` or `Dexie.js`) on the frontend.
2.  **Sync Process (Download):**
    *   When the staff opens the Scanner view (online), the app fetches a compressed "Check-in Manifest" (JSON).
    *   Manifest contains: `ticket_code`, `attendee_name`, `current_status`, `ticket_type`.
    *   This is stored in IndexedDB.
3.  **Scanning (Offline):**
    *   Scanner reads QR Code.
    *   App queries IndexedDB.
    *   If found + valid -> Mark "Checked In" locally + add to `pending_sync_queue`.
    *   UI shows "Success (Offline)".
4.  **Sync Process (Upload):**
    *   App listens for `window.ononline` or polls for connection.
    *   Flushes `pending_sync_queue` to the backend API (`/api/checkin/batch`).
    *   Backend processes and returns updated statuses.

## 4. Webhooks & Events

We will use Laravel's Event system to decouple logic.

*   `OrderPaid` -> Sends Email, Decrements Inventory (if not done at reservation).
*   `TicketCheckedIn` -> Updates Real-time Dashboard via Pusher/Reverb (optional V2) or polling.
