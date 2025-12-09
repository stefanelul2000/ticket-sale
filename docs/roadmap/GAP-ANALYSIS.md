# Gap Analysis & Discovery

**Generated:** 2025-05-18
**Context:** Transformation of existing Laravel/React foundation into a full-featured Event Ticketing SaaS.

## 1. Executive Summary
The current codebase provides a solid foundation for *internal* ticket management (creation, generation, basic check-in), but lacks the core "Commerce" and "SaaS" features required for a public-facing platform. Specifically, there is no public storefront, no shopping cart/checkout flow, and no real "Order" concept (only individual tickets).

## 2. Feature Gap Matrix

| Feature Category | Target Feature | Current Status | Gap / Missing Logic |
| :--- | :--- | :--- | :--- |
| **Ticketing** | Multi-ticket types | **Partial** | `TicketType` exists, but no logic for "Free vs Paid vs Donation" behavior. |
| | Capacity Management | **Partial** | Basic `capacity` field on Event, but no atomic locking during checkout. |
| | Promo Codes | **Foundational** | Model exists (`PromoCode`), but no API endpoints or application logic (validation/discounting). |
| | Taxes/Fees | **Missing** | No database columns or calculation logic for fees/taxes. |
| **Event Mgmt** | Event Dashboard | **Basic** | Simple CRUD exists. Needs stats visualization and rich editing. |
| | Homepage Designer | **Missing** | No CMS-like capability for event pages. |
| | Embeddable Widget | **Missing** | No JS SDK or iframe logic for external sites. |
| | Offline Support | **Missing** | App is fully online-dependent. |
| **Orders** | Custom Checkout Forms | **Missing** | No form builder or flexible questions per ticket. |
| | Refunds | **Basic** | `/refund` endpoint exists but only flags a ticket. No payment gateway refund logic. |
| | Bulk Messaging | **Missing** | No email/SMS broadcast capability. |
| | Export to CSV | **Basic** | `/events/{event}/tickets` export exists. Needs expansion for Orders/Attendees. |
| **Tech/Ops** | QR Check-in (Offline) | **Missing** | Current check-in is API-bound (`/checkin`). Needs local sync strategy. |
| | Stripe Connect | **Missing** | No payment integration exists. |
| | Webhooks | **Missing** | No event broadcasting system for external integrations. |
| | RBAC (Roles) | **Present** | Good foundation (`middleware('role:X')`). Needs expansion for granular permissions (Org Admin vs Event Manager). |

## 3. Reusable Assets & Foundation
We will leverage the following existing components:

*   **Authentication:** Laravel Sanctum is already set up and working.
*   **RBAC System:** The `Role` and `Permission` models + middleware are solid.
*   **Ticket Generation:** The unique code generation logic in `Ticket` model is reusable.
*   **Frontend Stack:** Vite + React + Zustand is a modern stack. We can extend the existing `dashboard` layout.

## 4. Critical Technical Decisions (Pre-Architecture)
*   **Order Model:** Must be introduced to aggregate Tickets. An Order belongs to a User (Buyer) and has multiple Line Items (Tickets).
*   **Public API:** Need to create a set of public endpoints (or a separate `api/shop` group) that doesn't require Admin/Manager login, but might require "Guest" tokens or ephemeral sessions.
