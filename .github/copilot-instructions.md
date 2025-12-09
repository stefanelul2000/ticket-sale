# Copilot Instructions for Ticket Sale

This guidance helps coding agents (Copilot / AI coders) contribute successfully to the Ticket Sale monorepo.

Summary (Big Picture)
- This is a monorepo: `app/backend` (Laravel API) + `app/frontend` (React + Vite). Docker-based development/deploy using `docker/docker-compose.yml` and `docker/Dockerfile`.
- Frontend builds into the Laravel public directory: `app/frontend/vite.config.ts` sets `outDir: ../backend/public` and `emptyOutDir: false` to preserve uploaded assets.
- Runtime API URL is injected at container start via `docker/entrypoint.sh` into the `public/config.js` template in `docker/runtime-config.template.js`. The frontend reads `window.__APP_CONFIG__.API_URL` in `app/frontend/src/lib/api.ts`.
- Authentication is session/cookie-based (Laravel Sanctum). `axios` is configured with `withCredentials: true` in `app/frontend/src/lib/api.ts`. `useAuth` checks both cookies and `localStorage/sessionStorage` flags (`ts_remember`, `ts_logged_in`).

Where to start when asked to modify behavior
- For endpoints & RBAC: inspect `app/backend/routes/api.php` and `app/backend/app/Http/Controllers/*` for controllers; role-guarded groups use `role:X` (e.g., `role:5` for admin). Map numeric role ids as seeded in `database/seeders/RoleSeeder.php`.
- For UI work: check `app/frontend/src/ui` and `app/frontend/src/state` for global stores (Zustand), API usage (`app/frontend/src/lib/api.ts`), and component conventions.
- For setup flow: `app/backend/app/Http/Controllers/SetupController.php` implements the setup wizard (writes `.env`, seeds DB roles/permissions, creates owner user). `SETUP_ENABLED` controls whether setup is permitted.

Important Patterns & Project Conventions (do not assume defaults)
- Role numeric values are seeded and meaningful: viewer=1, check-in=2, seller=3, event manager=4, admin=5, owner=6. Use `RoleSeeder`/`PermissionSeeder` for precise IDs.
- Impersonation: Admins can impersonate lower roles. Check `app/backend/app/Http/Middleware/Impersonate.php` and `ForbidImpersonationTargets.php` for the rules. Admin actions are logged to `admin_logs` (`app/backend/database/migrations/...create_admin_logs_table.php`) using `logAdminAction` helper in base `Controller`.
- Frontend runtime config is performed at container start (see `docker/entrypoint.sh`) by replacing `__API_URL__` in `public/config.js`. Local dev uses `VITE_API_URL` in `.env` (or environment variables) for Vite proxy.
- Frontend builds into the Laravel public folder; avoid wiping `public` on local builds (`emptyOutDir: false`). Docker copies the built `public` into the final PHP image stage.
- Sessions and token handling: backend uses Laravel Sanctum with cookie-session approach. Clients use Axios with `withCredentials: true` and `useAuth.fetchMe` checks for `laravel_session` or `remember_web` cookie.

## Developer Workflows (Command snippets)
\- Docker development (recommended):
```bash
cd docker
docker compose up -d --build
```
\- Frontend dev (local):
```bash
cd app/frontend
npm install
npm run dev
```
\- Backend local dev (optional):
The quickest local development method is still Docker-based (mirrors CI). You can use `php artisan serve` for quick edits, but for testing/verification we recommend building and running the same container image used by CI and running tests inside it.

1) Build a local image that matches the Compose image tag (so `docker compose` uses it instead of pulling):
```bash
# from repository root
docker build -f docker/Dockerfile -t ghcr.io/stefanelul2000/ticket-sale:dev-latest .
```

2) Start services with compose (uses the image name from the Compose file):
```bash
cd docker
docker compose up -d --build
```

3) Run an interactive shell or tests inside the running app container (recommended)
```bash
docker compose exec app sh
# inside container
cd /var/www/html
composer test || php artisan test
```

If you prefer to run the app without Compose, use the same image and proper env values/volumes:
```bash
docker run --rm -d --name ticket-sale-app -p 8080:80 \
	-e APP_ENV=production -e APP_DEBUG=false \
	-e DB_HOST=db -e DB_DATABASE=ticket_sale -e DB_USERNAME=ticket_user -e DB_PASSWORD=ticket_pass \
	-v /host/path/ticket-sale/storage:/var/www/html/storage \
	-v /host/path/ticket-sale/config:/config \
	ghcr.io/stefanelul2000/ticket-sale:dev-latest
```

\- Tests (backend):
```bash
# Recommended (run tests inside the running app container after a local build):
docker compose exec app php artisan test

# Or run composer tests inside the container shell:
docker compose exec app sh -c "composer test"

# (Optional) Run phpunit locally using composer if you prefer:
cd app/backend
composer test
```
- Build & publish (CI/GitHub actions): `.github/workflows/docker-publish.yml` builds Docker image and runs basic healthcheck.

Files & Areas an agent should consult first
- `README.md` (root) — Quick start & general project info
- `docs/GEMINI-KNOWLEDGE-BASE.md` — Detailed architecture and tech stack
- `docker/docker-compose.yml`, `docker/Dockerfile`, `docker/entrypoint.sh` — containerization & runtime config
- `app/backend/routes/api.php` — All backend HTTP routes and role-affecting middleware
- `app/backend/app/Http/Controllers` — Controllers (logic for endpoints)
- `app/backend/app/Http/Middleware` — Impersonation & role checks
- `app/frontend/src/lib/api.ts` & `app/frontend/src/state` — API client and client-side state patterns
- `app/frontend/vite.config.ts` — build output settings
- `app/backend/database/seeders` — seeded roles and permissions (explicit IDs / mapping)
- `docs/roadmap/ARCHITECTURE-V1.md` — intended future patterns (useful context but not enforced by code)

Project restrictions and gotchas
- `emptyOutDir: false` in Vite config is intentional to avoid deleting uploaded files in `public` during local builds — do not change unless you handle public asset persistence.
- The Docker image writes persistent `.env` to `ENV_STORE_PATH` (default `/config/app.env`) to survive container restarts; code assumes `/config` is a mounted volume. `docker/entrypoint.sh` handles migrations once (checks `/config/.provisioned`).
- Do not assume token header auth; the project uses cookie sessions (Sanctum). For automated API calls within CI or tests, use the backend helpers or `php artisan test` which handles sessions.
- For changing public URLs, update `VITE_API_URL` and ensure runtime injection via `public/config.js` template is preserved for the container to inject at runtime.

Common Changes & Examples
- Add a new endpoint: add route in `app/backend/routes/api.php`, create a controller or add to existing controller, add appropriate `role:X` middleware if restricted, and add API doc comments (OA attributes) in controller model for swagger.
- Add a frontend route: create view under `app/frontend/src/ui/views` and add a route in the central router (search for `pages`/`router` code in `src/ui`), use `api` client and `useAuth` store for session-aware flows.
- Changing auth/permission logic: inspect `app/backend/app/Http/Middleware/*` and `RoleSeeder` & `PermissionSeeder` for seeded role/permission assignments.

Quality & Tests
- Backend uses PHPUnit (`php artisan test`) and the `composer test` script.
- Linting & formatting: `app/backend` uses `laravel/pint` for PHP and `app/frontend` uses ESLint for TypeScript.
- CI builds and smoke tests the container using the `GET /api/health` endpoint.

If you open a pull request
- Ensure migrations are accompanied with the corresponding seeder updates for any role/permission changes.
- Preserve `public/config.js` runtime injection and do not remove `__API_URL__` token used by `docker/entrypoint.sh`.
- Include tests (backend or front) for permission checks or critical changes to API flows where feasible.

If you are unsure
- Run the standard local dev flow with Docker, `docker compose up -d --build` and confirm the health endpoint (`GET /api/health`) and the UI (`/`) are reachable.
- Read `app/backend/routes/api.php` to verify exact role/perm restrictions and `app/frontend/src/lib/api.ts` for the expected client contract.

## Agent Git & Commit Guidance (for Copilot / AI agents)

- Do not commit every file you change as tiny single-file commits. Prefer grouping related edits into meaningful, testable commits and keep your commit count reasonable.
- When possible, batch changes into commits that touch **no more than ~10 files** per commit. This keeps reviews focused and the commit history clear — but use judgement (some changes will span more files).
- Commit message format: `type(scope): short description` (e.g., `feat(auth): add impersonation`, `fix(api): handle pagination`, `chore(docs): update dev README`). Use `feat`, `fix`, `refactor`, `chore`, `test`, `docs` types.
- Stage changes selectively using `git add file1 file2 ...` or `git add -p` to interactively stage hunks. A quick helper to stage the next 10 files (use with caution and inspect before committing):
	```bash
	git add $(git status -s | awk '{print $2}' | head -n 10)
	git diff --staged --name-only
	git commit -m "<type>(<scope>): <brief description>"
	```
- If your change impacts both frontend and backend in a single logical update, consider separate commits for each area (`feat(frontend): ...`, `feat(backend): ...`) instead of one monolithic commit.
- Avoid committing generated artifacts or build directories (e.g., `node_modules`, `public/dist`, `vendor`) — ensure `.gitignore` excludes these.
- When in doubt, use `git rebase -i HEAD~n` to squash trivial iterative commits into a single coherent commit before opening your PR. The repository uses Squash & Merge for PRs — align commit granularity to the PR scope.
- Keep each PR focused: group related changes into a single PR with small, descriptive commits. A typical PR should be reviewable in 10–20 minutes.

## Dev helpers (Makefile & smoke test)
We added a small Makefile and a smoke test script to simplify running the recommended dev workflows.

- Start mounted dev compose (hot code reload for backend and frontend):
```bash
make dev
```
- Build the dev image used for the Compose network (optional):
```bash
make build-image
```
- Run the CI-like smoke test locally (MySQL + app image + /api/health):
```bash
make smoke-test
```
You can pass `SMOKE_PORT` and `IMAGE_NAME` environment variables to override port and image used by the `smoke-test-local.sh` script, e.g.:
```bash
SMOKE_PORT=8082 IMAGE_NAME=ghcr.io/yourorg/ticket-sale:dev-latest make smoke-test
```
- Run the backend test suite inside the app container:
```bash
make test
```

These helpers call the override compose and the `scripts/smoke-test-local.sh` which replicates the GH Actions smoke test.

## nginx vs `php artisan serve` in development
Using `nginx` + `php-fpm` in your dev overlay is more accurate, but slightly slower and more complicated.

- `php artisan serve` (used in the example override) is quick and convenient — it requires fewer moving parts and is friendly for iterative backend development.
- `nginx` + `php-fpm` mirrors the runtime in the `Dockerfile` and CI (nginx, php-fpm), which means you have higher confidence for production parity: `public/config.js` injection is identical, nginx-level redirects, caching, and static file handling are exercised, and `entrypoint.sh` logic can be verified.

When to use each:
- Use `php artisan serve` when you need fast iteration for PHP controller logic and want a shorter feedback loop.
- Use `nginx` + `php-fpm` when testing behavior that depends on the web server layer (HTTP headers, static file serving, nginx rewrite rules), when validating `entrypoint.sh` steps like env injection, or when preparing a release candidate.

Example `docker-compose.override.yml` snippet to run nginx+php-fpm and preserve mounts (instead of `php artisan serve`):
```yaml
services:
	app:
		build:
			context: ..
			dockerfile: docker/Dockerfile
		image: ${IMAGE_NAME:-ghcr.io/stefanelul2000/ticket-sale:dev-latest}
		volumes:
			- ../app/backend:/var/www/html:delegated
			- ../app/frontend:/app/frontend:delegated
			- backend_vendor:/var/www/html/vendor
			- frontend_node_modules:/app/frontend/node_modules
		environment:
			APP_ENV: local
			APP_DEBUG: "true"
			VITE_API_URL: "http://localhost:8080/api"
		# Let entrypoint handle starting php-fpm + nginx
		entrypoint: ["/entrypoint.sh"]
		command: []
```

Note: `entrypoint.sh` will attempt to run migrations and write `.env` from `/config`; when testing with mounts, ensure the `/config` mount (volume) is writable and present.

## Container dev with mounts (fast iteration loop)

Yes — you can keep a local Compose override that mounts your repository into the running app container rather than copying the source into the image on every build. This preserves runtime parity and greatly improves iteration time for code-only changes.

Example `docker/docker-compose.override.yml` to mount sources and persist `vendor` / `node_modules`:
```yaml
services:
	app:
		build:
			context: ..
			dockerfile: docker/Dockerfile
		image: ${IMAGE_NAME:-ghcr.io/stefanelul2000/ticket-sale:dev-latest}
		volumes:
			- ../app/backend:/var/www/html:delegated
			- ../app/frontend:/app/frontend:delegated
			- backend_vendor:/var/www/html/vendor
			- frontend_node_modules:/app/frontend/node_modules
		environment:
			APP_ENV: local
			APP_DEBUG: "true"
			VITE_API_URL: "http://localhost:8080/api"
		command: ["sh", "-lc", "php artisan migrate --force; php artisan serve --host=0.0.0.0 --port=80"]

volumes:
	backend_vendor: {}
	frontend_node_modules: {}
```

Start development compose with override:
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

Notes & tips:
- The override uses `build` so you still get an image with the right runtime, but mounting prevents rebuilding after each code change.
- Rebuild the image whenever you update system packages, pecl extensions, or change `Dockerfile` steps; mounting is for code-only changes.
- Run `composer install` / `npm install` in the container or on host if you change `composer.json` / `package.json`.
- If you need the exact CI image for final verification (entrypoint `migrate`/`seed`, `config.js` injection), do a full `docker build` and run the smoke tests locally.
- Watch file ownership & permissions for mounted volumes (PHP should be able to write storage and cache directories). Use `chown -R www-data:www-data storage bootstrap/cache public` in the container if needed.

When to rebuild vs mount — quick checklist
- Rebuild (full image) when:
	- You update `Dockerfile`, add system dependencies, or require new PHP extensions / PECL modules.
	- You change `composer.json` / `package.json` and want a cached, reproducible image for CI.
	- You need to verify the containerized entrypoint or prod-like behavior.
- Mount (fast loop) when:
	- You only change application source code (PHP/TS/React, templates).
	- You are developing UI features and want HMR or immediate source tweaks visible.
	- You need faster restarts without re-building layers.

This approach keeps your development fast and equivalent to the automated CI/test cycle used by the repo.

Host mounts (bind mounts) vs named volumes note:
- Source files should be bind-mounted from the host into the container for fast iteration (this is what `docker/docker-compose.override.yml` does).
- For dependency folders like `vendor` (PHP) and `node_modules` (frontend), prefer named volumes unless you must inspect packages on the host or you need host-based builds; named volumes avoid OS mismatch for native modules and can improve performance.
- See `docker/README.dev.md` for details and sample alternative host-bind mount lines.
-- End
