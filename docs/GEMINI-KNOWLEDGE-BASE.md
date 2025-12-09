# Gemini Knowledge Base

## System Map

*   [API Endpoints](docs/api/endpoints.md)
*   [Frontend Components](docs/frontend/components.md)

This document serves as the central knowledge base for the project, detailing its architecture, technology stack, directory structure, and core workflows.

## 1. Project Overview

This monorepo contains a Laravel-based backend API and a React-based frontend application, designed for a ticket sales platform. It leverages Docker for consistent development and deployment environments.

## 2. Technology Stack

### 2.1 Backend (app/backend)

*   **Framework:** Laravel v12.x
*   **Language:** PHP ^8.2
*   **Authentication:** Laravel Sanctum (for API token authentication)
*   **API Documentation:** L5-Swagger (for generating OpenAPI/Swagger documentation)
*   **Key Dependencies:**
    *   `laravel/framework`: ^12.0
    *   `laravel/sanctum`: ^4.0
    *   `darkaonline/l5-swagger`: ^8.0
*   **Development Dependencies:**
    *   `fakerphp/faker`: ^1.23
    *   `laravel/breeze`: ^2.3
    *   `laravel/pail`: ^1.2.2
    *   `laravel/pint`: ^1.24 (Code style fixer)
    *   `laravel/sail`: ^1.41 (Docker development environment)
    *   `phpunit/phpunit`: ^11.5.3

### 2.2 Frontend (app/frontend)

*   **Framework:** React v19.2.0
*   **Language:** TypeScript ~5.9.3
*   **Build Tool:** Vite v7.2.4
*   **State Management:** Zustand v5.0.9
*   **HTTP Client:** Axios v1.13.2
*   **Key Dependencies:**
    *   `react`: ^19.2.0
    *   `react-dom`: ^19.2.0
    *   `zustand`: ^5.0.9
    *   `axios`: ^1.13.2
    *   `classnames`: ^2.5.1 (Utility for conditionally joining CSS class names)
    *   `jsbarcode`: ^3.11.6 (Barcode generation)
    *   `jszip`: ^3.10.1 (Create, read and edit .zip files)
*   **Development Dependencies:**
    *   `@vitejs/plugin-react`: ^5.1.1
    *   `eslint`: ^9.39.1
    *   `typescript`: ~5.9.3

### 2.3 Infrastructure (docker)

*   **Containerization:** Docker & Docker Compose
*   **Web Server:** Nginx
*   **PHP Runtime:** PHP-FPM (configured via Dockerfile)

## 3. Backend Architecture

### Key Resources

The backend API is organized around the following primary resources (domains), derived from controller names and route groups:

*   **Setup:** Endpoints for initial application configuration, such as status checks, database migration, logo upload, and database testing. (`SetupController`)
*   **Users:** Management of user accounts, including listing, creating, updating roles/status, and deletion. (`UserController`)
*   **Roles & Permissions:** Definition and management of user roles and fine-grained permissions. (`RoleController`, `PermissionController`)
*   **Impersonation:** An administrative feature allowing users with sufficient privileges to temporarily assume another user's role for debugging or administrative tasks.
*   **Branding:** Endpoints for managing application-wide branding elements, such as the company logo. (`BrandingController`)
*   **Events:** Creation, management, and deletion of events. (`EventController`)
*   **Ticket Types:** Definition and management of different ticket categories for events. (`TicketTypeController`)
*   **Tickets:** Operations related to ticket issuance, verification, check-in, refunds, and selling. (`TicketController`)
*   **Stats:** Provides statistics related to ticket sales and check-ins. (`TicketController`)
*   **Health:** A simple endpoint to check the application's operational status.

### Architectural Patterns

*   **MVC (Model-View-Controller):** Adheres to the standard Laravel MVC pattern, with dedicated Controllers for handling HTTP requests and Eloquent Models for interacting with the database.
*   **Role-Based Access Control (RBAC):** Implemented through Laravel middleware (`role:X`) to enforce authorization, ensuring that only users with specific roles can access certain API endpoints.
*   **Laravel Sanctum Authentication:** API authentication is managed using Laravel Sanctum, providing token-based authentication for single-page applications and mobile clients.
*   **Modular Controllers:** API logic is logically separated into controllers corresponding to different resources (e.g., `EventController`, `UserController`).
*   **Direct Business Logic:** Some business logic, particularly for `Setup` and `Impersonation`, is directly handled within route closures or dedicated controller methods. A distinct service layer is not explicitly observed as a widespread pattern at this stage.
*   **Eloquent ORM:** Database interactions are primarily handled via Laravel's Eloquent ORM, with occasional direct usage of the `DB` facade (e.g., for logging impersonation actions).

### Reverse Proxy / HTTPS considerations

If the application runs behind a reverse proxy that terminates TLS (HTTPS) and forwards requests to the application over HTTP, the application must be configured to trust the proxy so that generated URLs and the request scheme are correct. Failure to do so often results in mixed-content loading errors in the browser, content-security-policy issues, and assets or endpoint URLs being generated with the wrong scheme (http instead of https.)

Recommended steps:

- Ensure your reverse proxy (e.g., nginx) forwards the `X-Forwarded-Proto` header: `proxy_set_header X-Forwarded-Proto $scheme;`.
- Configure which proxies to trust by setting the `TRUSTED_PROXIES` environment variable (comma-separated addresses, or `*` to trust the request origin) — this project adds `config/trustedproxy.php` which reads `TRUSTED_PROXIES`.
- Set `APP_URL` to match your public-facing URL (e.g., `https://ticket.ciubi.net`).
- For the L5-Swagger UI specifically, you can prefer relative asset paths (avoids absolute scheme issues) by setting `L5_SWAGGER_USE_ABSOLUTE_PATH=false` or overriding it in `config/l5-swagger.php`. Optionally, set `L5_SWAGGER_PROXY` to the proxy IP(s) so the Swagger controller temporarily trusts them when rendering the UI.

These steps together prevent mixed-content errors when serving the UI over HTTPS and ensure generated swagger URLs use the correct scheme.

### API Structure

The `api.php` routes are generally grouped by functionality and protected by `auth:sanctum` and role-based middleware:

*   **`/setup/*`**: Publicly accessible endpoints for initial setup, without authentication.
*   **`/me`**: Authenticated endpoint to retrieve current user information, including impersonation status.
*   **`/roles`**: Authenticated, role-restricted (role 5 - admin/owner) for listing roles.
*   **`/users/*`**: Authenticated, role-restricted (role 5) for user management.
*   **`/permissions`**: Authenticated, role-restricted (role 5) for managing fine-grained permissions.
*   **`/impersonate`**: Authenticated, role-restricted (role 5) for starting and stopping impersonation.
*   **`/branding`**: Public endpoint for viewing branding, authenticated for updating.
*   **`/events/*`**: Authenticated, role-restricted (role 4 - event manager and above) for event management.
*   **`/ticket-types/*`**: Authenticated, role-restricted (role 4) for managing ticket types.
*   **`/tickets/*`**: Authenticated, role-restricted, with different roles (`role:2`, `role:3`, `role:4`) having varying access levels for verification, check-in, selling, generation, and refunds.
*   **`/stats`**: Authenticated, role-restricted (role 2 - check-in and above) for statistics.
*   **`/health`**: Public endpoint for application health checks.
*   **`/auth/*`**: (Included via `require __DIR__.'/auth.php'`) Contains standard authentication routes (login, register, password reset, etc.).

## 4. Directory Structure and Key Components

*   `/app/backend`: The Laravel application.
    *   `app/Http/Controllers`: Contains API controllers (e.g., `EventController`, `UserController`).
    *   `app/Models`: Eloquent ORM models (e.g., `Event`, `User`, `Ticket`).
    *   `database/migrations`: Database schema migration files.
    *   `routes/api.php`: Definitions for all backend API routes.
    *   `app/Http/Middleware`: Custom middleware for roles and impersonation.
*   `/app/frontend`: The React application.
    *   `src/main.tsx`: Entry point for the React application.
    *   `src/lib/api.ts`: Centralized API client for interacting with the backend.
    *   `src/state`: Contains Zustand stores for global state management (e.g., `useAuth`, `useTheme`).
    *   `src/ui/components`: Reusable UI components (e.g., `Button`, `Card`, `Layout`).
    *   `src/ui/views`: Page-level components or views, often corresponding to routes (e.g., `admin`, `dashboard`, `events`, `auth`).
*   `/docker`: Contains Docker related files for local development and deployment.
    *   `docker-compose.yml`: Defines the multi-container Docker application.
    *   `Dockerfile`: Defines the Docker image for the application.
    *   `nginx.conf`: Nginx web server configuration.
*   `/docs`: Project documentation (this directory).
    *   `api`: API-specific documentation.
    *   `frontend`: Frontend-specific documentation.
    *   `decisions`: Architectural Decision Records (ADRs).

## 5. Core Workflows

*   **API Development:** Follows Laravel's established patterns for controllers, models, and routing. API endpoints are documented using L5-Swagger.
*   **Frontend Development:** React components are developed with TypeScript, utilizing Vite for a fast development experience. Zustand is used for efficient state management.
*   **Authentication:** Managed via Laravel Sanctum on the backend, with the frontend responsible for token handling and secure communication.
*   **Local Development:** Utilizes Docker Compose for setting up the entire development environment, including database, web server, and application containers.
*   **Code Quality:** Enforced with PHP Pint for backend and ESLint for frontend.
*   **Testing:** PHPUnit for backend unit and feature tests. Frontend testing strategy will be established.

## 6. Infrastructure

For detailed documentation on the project's infrastructure, refer to the following:

*   [Docker Infrastructure](docs/infrastructure/docker.md)
*   [Nginx Configuration](docs/infrastructure/nginx.md)
