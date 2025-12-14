# Frontend Components Documentation

This document provides an overview of the frontend application's key libraries and component structure.

## Key Libraries

The frontend application leverages the following significant libraries:

*   **Core Framework:** `react` (v19.2.0), `react-dom` (v19.2.0)
*   **State Management:** `zustand` (v5.0.9) - Used for managing global application state, such as authentication and theme settings.
*   **HTTP Client:** `axios` (v1.13.2) - For making HTTP requests to the backend API.
*   **Styling/Utility:** `classnames` (v2.5.1) - Utility for conditionally joining CSS class names.
*   **Barcode Generation:** `jsbarcode` (v3.11.6) - Used for client-side barcode generation.
*   **ZIP Manipulation:** `jszip` (v3.10.1) - For creating and manipulating ZIP archives, specifically for downloading multiple barcodes.
*   **Build Tool:** `vite` (v7.2.4) - Provides a fast development server and optimized build process.
*   **Language:** `typescript` (~5.9.3) - Ensures type safety and improves code quality.
*   **Linting:** `eslint` (v9.39.1) - For identifying and reporting on patterns found in ECMAScript/JavaScript code, ensuring code consistency and quality.

## Component Structure

The frontend components are organized logically within the `src/` directory, separating core utilities, state management, and UI concerns.

```
/app/frontend/src/
├── lib/
│   └── api.ts (Centralized Axios instance and API client methods for backend interaction)
├── state/
│   ├── useAuth.ts (Zustand store for authentication logic and user state)
│   └── useTheme.ts (Zustand store for managing application theme and branding settings)
├── index.css (Global CSS definitions powered by Tailwind + design tokens)
├── router/
│   └── RequireAuth.tsx (Guards protected routes by checking the auth store)
├── router.tsx (Browser router definition + layout wiring)
├── layouts/
│   ├── AppLayout.tsx (Sidebar/topbar shell for authenticated routes)
│   └── AuthLayout.tsx (Centered layout for login/register)
├── ui/
│   ├── App.tsx (The root React component hosting `<RouterProvider />`)
│   ├── components/
│   │   └── ui/ (Tailwind primitives such as `Button`, `Card`, `Input`, `Spinner`)
│   └── pages/
│       ├── DashboardPage.tsx (Dashboard stats + ticket ops)
│       ├── EventsIndexPage.tsx / EventEditorPage.tsx (Event + ticket-type management)
│       ├── TicketsPage.tsx (Ticket tooling placeholder)
│       ├── AdminUsersPage.tsx / AdminRolesPage.tsx (RBAC management)
│       └── LoginPage.tsx / RegisterPage.tsx (Auth flows rendered inside `AuthLayout`)
```

Legacy folders such as `src/ui/views` and `src/ui/components/Layout.tsx` have been deleted; every page now lives under `src/ui/pages`.
