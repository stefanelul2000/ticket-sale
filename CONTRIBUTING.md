# Contributing to Ticket Sale

Welcome! This project uses a Docker-based development environment to keep parity with CI and production. This guide helps contributors get set up quickly and provides a PR checklist to keep changes stable.

## Quick dev setup (recommended)
1. Build the local image used by `docker-compose` (matches CI runtime):
```bash
make build-image
```
2. Start the Compose dev overlay (bind-mounted source + named volumes):
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```
3. Run frontend dev server (optional, uses HMR):
```bash
cd app/frontend
npm install
VITE_API_URL=http://localhost:8080/api npm run dev
```
4. Run backend tests inside container (recommended):
```bash
make test
```

## Speed tips and workflows
- Fast iteration: Bind mount source files into the container with the override compose. Avoid rebuilding the Docker image on each change.
- When to rebuild: Rebuild if the `Dockerfile` changes or you added system-level packages (PECL, libs) or you updated `composer.json`/`package.json` and want a reproducible image.
- Local quick backend edits: Use `php artisan serve` locally for quick controller tests; however, use container-based image for integration/CI parity checks.
- If you change dependencies:
  - Run `composer install` inside the container or on host depending on your setup, or rebuild the image (for a reproducible environment).

## Running smoke tests locally (CI-like test)
Use the smoke test script which produces the same environment the CI does (MySQL + app image + `GET /api/health`):
```bash
# run with default port 8081 to avoid conflicts
make smoke-test
# override image/port if desired
SMOKE_PORT=8082 IMAGE=ghcr.io/yourorg/ticket-sale:dev-latest make smoke-test
```

## Development compose notes
- The override `docker/docker-compose.override.yml` mounts code with a bind mount to get immediate updates.
- The override also uses named volumes for `vendor` and `node_modules` by default; uncomment the host-bind entries if you prefer to mount these on your host (see `docker/README.dev.md` for trade-offs).
- When testing production parity, use `nginx` + `php-fpm` (override snippet provided) and run a `docker build` to test exactly what CI will build.

## Tests & Linting
- Backend: `make test` (runs tests inside the app container), or `composer test` locally in the backend if you prefer.
- Frontend: `cd app/frontend && npm run build` and `npm run lint`.

## PR Checklist
Before opening a PR, ensure the following:
> Repository policy: **Squash & merge**
- We prefer pull requests to be merged using GitHub's `Squash and merge` option so feature branches have a single logical commit in master. Use the PR template to ensure your PRs follow the required checklist.

## PR - How to test locally
```bash
make build-image
cd docker
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```
- Run tests or open the app at `http://localhost:8080`.

## Troubleshooting
- `public/config.js` not updated? Ensure the container's `entrypoint.sh` runs and `VITE_API_URL` is set.
- HMR not working? Ensure `VITE_API_URL` points to a dev backend (http://localhost:8080/api or the dev port you use).
- File permissions issues? Run `docker compose exec app sh -c "chown -R www-data:www-data storage bootstrap/cache public"`.

Thanks for contributing — PRs and repo maintainers are appreciated!