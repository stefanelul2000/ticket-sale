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
├── styles/
│   └── global.css (Global CSS definitions, custom properties, and responsive layout classes)
├── ui/
│   ├── App.tsx (The root React component, handling routing/view switching and global state orchestration)
│   ├── styles.ts (TypeScript file for shared inline CSS styles, e.g., inputStyle, colorStyle)
│   ├── components/
│   │   ├── Button.tsx (A reusable button component with different variants)
│   │   ├── Card.tsx (A generic card component for displaying content blocks with titles and actions)
│   │   ├── Layout.tsx (The primary layout component, including header, optional sidebar, and content area, with responsiveness)
│   │   └── ThemeControls.tsx (UI component for adjusting and applying theme colors)
│   └── views/
│       ├── admin/
│       │   └── AdminView.tsx (Dedicated view for administrative tasks: user management, role editing, branding)
│       ├── auth/
│       │   ├── LoginView.tsx (User login interface)
│       │   └── RegisterView.tsx (User registration interface)
│       ├── dashboard/
│       │   └── DashboardView.tsx (Main application dashboard showing ticket selling/checking, and statistics)
│       ├── events/
│       │   └── EventsView.tsx (View for managing events and their associated ticket types)
│       └── setup/
│           └── SetupView.tsx (A wizard-like view for initial application setup and configuration)
```