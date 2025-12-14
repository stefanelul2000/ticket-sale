# Docker development (override) — Quick Guide

This file documents the `docker/docker-compose.override.yml` recommended for fast local development and explains the trade-offs between host bind mounts and named volumes.

Why use an override?
- Keep your Dockerfile and production image the same as CI while enabling a development workflow where source files are mounted into the app container to avoid rebuilding the image on every change.
- Let `entrypoint.sh` run normally so environment injection and migration are exercised.

Starting dev with the override
```bash
cd docker
# start with the override; it will build the local image and mount the sources
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

Which files should be mounted?
- Mount your repository sources (backend and frontend) as host bind mounts so code changes show up immediately in the running container.
  ```yaml
  - ../app/backend:/var/www/html:delegated
  - ../app/frontend:/app/frontend:delegated
  ```

Dependencies (vendor/node_modules)
- The override now mounts the host `vendor` and `node_modules` directories so Composer/NPM installs on your workstation are immediately reflected inside the container (no empty named volumes to seed).
  ```yaml
  - ../app/backend/vendor:/var/www/html/vendor:delegated
  - ../app/frontend/node_modules:/app/frontend/node_modules:delegated
  ```
- If you prefer isolated installs, replace those entries with named volumes (see the commented example inside the compose file) and run `composer install`/`npm install` inside the container once to populate them.

Rebuild policy checklist
- Rebuild (full image) when:
  - You change the Dockerfile, OS packages, or require PECL extensions.
  - You change `composer.json` or `package.json` and want a clean, reproducible build.
  - You want to mimic the exact CI image for pre-merge verification.
- Mount (fast loop) when:
  - You change only PHP/TS/React source code.
  - You need fast front-end hot reload or immediate backend edits without rebuilds.

Permissions & Ownership
- The app container runs as `www-data`. If you face permission problems on mounted directories (for example, `storage`, `bootstrap/cache`), run:
  ```bash
  docker compose exec app sh -c "chown -R www-data:www-data storage bootstrap/cache public"
  ```

Using nginx vs `php artisan serve`
- The `Dockerfile` and CI use `nginx + php-fpm`. Use the `entrypoint.sh` in the container to replicate the production environment and web server behavior.
- You may override the `command` in the override compose to use `php artisan serve` for faster iteration; however, the `nginx` behavior (header handling, caching, static file serving) will not be reproduced.

Troubleshooting
- Dev assets not showing or HMR failing: ensure Vite is running in the frontend (or that you built assets into `backend/public`) and set `VITE_API_URL` to your dev backend `http://localhost:8080/api` as needed.
- `public/config.js` not set: When running the app container with `entrypoint.sh`, it will attempt to inject the runtime `API_URL` into `public/config.js`.

Notes for Windows users
- Bind mount behavior varies on Windows (WLS2 vs Docker Desktop) and file system performance might be slower; in such cases consider named volumes for `vendor/node_modules`.

Extra: smoke test & image overrides
- Use `scripts/smoke-test-local.sh` to run a CI-like smoke test locally (MySQL + app image + `/api/health`). This script respects `IMAGE` or `IMAGE_NAME` and `SMOKE_PORT` environment variables.
- Example: `SMOKE_PORT=8082 IMAGE=ghcr.io/yourorg/ticket-sale:dev-latest ./scripts/smoke-test-local.sh` will run the healthcheck on host port `8082`.
