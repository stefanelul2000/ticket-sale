# Project History

## 2025-12-09 - 09:00 — [Initialization] Documentation Bootstrap

*   **Summary:** Initial setup and population of the `/docs` structure.
*   **Details:**
    *   Established `/docs` structure (API, Frontend, Decisions).
    *   Mapped backend routes and frontend components.
    *   Indexed Docker infrastructure.
*   **Affected Files:**
    *   `docs/GEMINI-KNOWLEDGE-BASE.md`
    *   `docs/GEMINI-CHANGELOG.md`
    *   `docs/api/endpoints.md`
    *   `docs/frontend/components.md`
    *   `docs/decisions/*.md`
*   **Architectural Impact:** Creation of the central documentation system for the project.

## 2025-12-09 - 12:00 — [Documentation Refactor] Refactored infrastructure documentation.

*   **Summary:** Moved detailed Docker and Nginx configuration from `GEMINI-KNOWLEDGE-BASE.md` to dedicated files.
*   **Details:** The "Infrastructure" section of `GEMINI-KNOWLEDGE-BASE.md` was replaced with links to `docs/infrastructure/docker.md` and `docs/infrastructure/nginx.md`.
*   **Affected Files:**
    *   `docs/GEMINI-KNOWLEDGE-BASE.md`
    *   `docs/infrastructure/docker.md` (new)
    *   `docs/infrastructure/nginx.md` (new)
    *   `docs/GEMINI-CHANGELOG.md`
*   **Architectural Impact:** Enhanced documentation organization and modularity, improving readability and maintenance of infrastructure details.

## 2025-12-09 - 12:30 — [Fix] Swagger mixed-content + reverse proxy compatibility

*   **Summary:** Fixes for L5-Swagger to reduce mixed-content issues when running the app behind an HTTPS reverse-proxy and notes for trusted proxies.
*   **Details:** Switched Swagger to use relative asset/document paths by default (opt-in via `L5_SWAGGER_USE_ABSOLUTE_PATH`), added a `config/trustedproxy.php` file to allow configuring trusted proxies via `TRUSTED_PROXIES` env var, and made L5-Swagger proxy setting configurable by `L5_SWAGGER_PROXY` env var. These changes help the app detect forwarded https requests and avoid generating http asset URLs.
*   **Affected Files:**
    *   `app/backend/config/trustedproxy.php` (new)
    *   `app/backend/config/l5-swagger.php` (updated)
    *   `app/backend/.env.example` (updated)
    *   `docs/GEMINI-KNOWLEDGE-BASE.md` (updated)
*   **Architectural Impact:** Better reverse proxy compatibility; fixes HTTPS mixed-content and CSP errors for asset loading in Swagger UI.