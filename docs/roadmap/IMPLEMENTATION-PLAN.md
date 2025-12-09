# Implementation Roadmap

This plan breaks down the transformation into 4 actionable Sprints.

## Sprint 1: Core Commerce & Data Modeling
**Goal:** Ability to model a "Paid Event" and process a basic order flow (API level).

*   **1.1 Database Migration:**
    *   Create `orders`, `order_items`, `attendees` tables.
    *   Add `stripe_accounts` table.
    *   Update `events` with commerce fields (currency, slug).
*   **1.2 Models & Relationships:**
    *   Define Eloquent relationships (Event -> Orders, User -> StripeAccount).
    *   Implement `PromoCode` logic (validation service).
*   **1.3 Stripe Connect Foundation:**
    *   Implement "Connect with Stripe" OAuth flow for Organizers.
    *   Store Stripe Account IDs.
*   **1.4 Checkout API (Backend):**
    *   Create `POST /api/checkout/session`: Validate cart, calculate totals (inc. taxes/fees), create `PaymentIntent`.
    *   Create `POST /api/webhooks/stripe`: Listen for `payment_intent.succeeded` to finalize Order.

## Sprint 2: The Storefront (Frontend)
**Goal:** Public-facing pages where users can actually buy tickets.

*   **2.1 Event Homepage:**
    *   Create public route `/e/{slug}`.
    *   Design responsive layout displaying Event Info + Ticket List.
*   **2.2 Checkout Experience:**
    *   Build "Cart" state (Zustand).
    *   Integrate Stripe Elements (Payment Element).
    *   Build "Success/Ticket View" page.
*   **2.3 Embed Widget:**
    *   Create a standalone entry point (`embed.tsx`) that renders a stripped-down Ticket Selector.
    *   Generate `<iframe>` snippet code in Organizer Dashboard.

## Sprint 3: Ops & Fulfillment
**Goal:** Delivering the product (tickets) and managing entry.

*   **3.1 PDF Ticket Generation:**
    *   Integrate a PDF library (e.g., `dompdf` or `browsershot`).
    *   Generate PDF on successful order.
*   **3.2 Email Delivery:**
    *   Set up Laravel Mailables for `OrderConfirmation`.
    *   Attach PDF tickets.
*   **3.3 Offline Scanner (Frontend):**
    *   Implement `scanner` route.
    *   Integrate `react-qr-reader`.
    *   Implement `IndexedDB` sync logic (download manifest, queue offline scans).

## Sprint 4: Enterprise Features
**Goal:** Polish and advanced tools for power users.

*   **4.1 Webhooks:**
    *   Create UI for Organizers to add Webhook URLs.
    *   Implement `WebhookDispatchJob` to send JSON payloads on events (`order.created`).
*   **4.2 Advanced RBAC:**
    *   Refine Permissions for "Collaborators" (e.g., specific event access only).
*   **4.3 Data Export:**
    *   Implement CSV streaming for "All Orders" and "All Attendees".
*   **4.4 Bulk Messaging:**
    *   Create "Message Attendees" UI in Dashboard.
    *   Implement Queue job to send emails.
