# Ticket Sale (Frontend)

React + TypeScript + Vite SPA that consumes the Laravel API.

## Getting started
```bash
cd frontend
npm install
npm run dev   # starts Vite dev server on :5173 (proxy to API via VITE_API_URL)
npm run build # builds to ../backend/public/assets
```

Set `VITE_API_URL` if your API isn’t at the default `http://localhost:8080/api`.

## Features
- Auth/login/register with Remember Me.
- Admin setup wizard (DB, mail, branding).
- Event management, ticket type management, ticket generation.
- Ticket sell/verify/check-in flows with scan history.
- Ticket downloads: CSV, barcode PNG sheet, ZIP of per-ticket barcodes.
- Theming/branding (logo + colors) for admins.
- Role-based UI gating for viewer/check-in/seller/event manager/admin.

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint

## Notes
- Build output is published to `backend/public/assets`.
- For barcode downloads to work well with scanners, use the PNG sheet or ZIP (one PNG per ticket).
