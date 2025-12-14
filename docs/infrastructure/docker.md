# Docker Infrastructure

This document details the Docker-related configuration for the project, including services, ports, and volumes defined in `docker-compose.yml` and built via `Dockerfile`.

## Services

*   `app`: Main application service (Laravel, Nginx, PHP-FPM) built from the Dockerfile, depends on `db` and `redis`. The image now runs `/init` from **s6-overlay v3**, which supervises `nginx` and `php-fpm82`.
*   `db`: MySQL 8.0 database service.
*   `redis`: Redis 7-alpine cache/queue service.
*   `phpmyadmin` (override only): phpMyAdmin 5 service exposed on `http://localhost:8081` for convenient inspection of the `db` container.

### Healthchecks

`docker-compose.yml` defines healthchecks so orchestration can wait for each dependency:

* `app` container hits `http://localhost/health` via curl (inside the container). The check runs every 30s with a 5s timeout and a 30s start period.
* `db` uses `mysqladmin ping` with the root password to ensure MySQL is listening before `app` attempts migrations or connections.
* `redis` runs `redis-cli ping`. Their health statuses can be queried with `docker compose ps` to understand readiness during startup.

## Ports

*   `app`: Host port `8080` maps to container port `80`.
*   `db`: Host port `3306` maps to container port `3306`.
*   `redis`: Host port `6379` maps to container port `6379`.

## Volumes

* `app` service:
    * `/host/path/ticket-sale/storage` (host) -> `/var/www/html/storage` (container) - for Laravel's persistent storage (`/var/www` is symlinked to `/var/www/html` in the image for compatibility).
    * `/host/path/ticket-sale/config` (host) -> `/config` (container) - for runtime configuration persisted between restarts.
    * `/host/path/ticket-sale/logs` (host) -> `/var/log` (container) - surfaces nginx/PHP/system logs directly on the host for troubleshooting.

* `db` service:
    * `db-data` (named volume) -> `/var/lib/mysql` (container) - for persistent MySQL data.

### Init + Supervision (`docker/rootfs`)

The stack now uses **native s6-rc v3 packages** under `docker/rootfs/etc/s6-overlay/s6-rc.d`:

* `env-setup` (oneshot) applies `TZ`, remaps `www-data` using `PUID`/`PGID`, ensures `/var/www` ownership is consistent, and creates `/var/log/{nginx,php82}` + `/var/lib/nginx/logs` for host-mounted logs.
* `laravel-bootstrap` (oneshot) depends on `env-setup` and reuses `docker/entrypoint.sh` with `INIT_ONLY=true` to run the Laravel bootstrap (env linking, swagger generation, migrations/seeds if enabled, config injection).
* `php-fpm` and `nginx` are longrun services that depend on `laravel-bootstrap` and `php-fpm` respectively. They execute the same commands as before (`php-fpm82 -F`, `nginx -g "daemon off;"`) but now run under full s6-rc supervision without legacy compatibility shims.
* `user/contents.d/{env-setup,laravel-bootstrap,php-fpm,nginx}` enrolls these packages into the default runlevel so they start automatically when `/init` launches.

### Swagger generation helpers & build flags

* Docker build-time generation: by default the Docker image build generates the `api-docs.json` file and bakes it into the final image for deterministic behavior. Ensure `APP_URL` is passed as a build-arg to provide the correct base URL for the swagger file.
* Entrypoint runtime env: `GENERATE_L5_SWAGGER_ON_STARTUP` (default: `false` in `.env.example`). If set to `true`, the `laravel-bootstrap` oneshot (`docker/entrypoint.sh` via `INIT_ONLY=true`) will run `php artisan l5-swagger:generate` on container startup.

If storing `storage` on a host bind mount, ensure that write permissions are set for the container user (www-data, UID/GID 82:82) so the generator can write `api-docs.json`.

Development Tip: To validate swagger endpoints quickly after start, run the script in `scripts/check-swagger-endpoint.sh`:

```bash
scripts/check-swagger-endpoint.sh localhost 8080
```

This script waits for the health endpoint and ensures the swagger JSON and UI URL are available.

### Developer Mounts, Timezone, & Permissions

The container now exposes three environment knobs to match host expectations:

* `PUID` (default `1000`) and `PGID` (default `1000`) remap `www-data` so bind-mounted files are owned by the host UID/GID.
* `TZ` (default `UTC`) updates `/etc/localtime` and `/etc/timezone` by linking `/usr/share/zoneinfo/$TZ`.

After the remap, the bootstrap continues to make mounted directories writable by both the container's webserver (`www-data`) and the host user to improve the developer experience:

*   The entrypoint will try to `chown -R www-data:www-data` the directories used by the application: `storage`, `bootstrap/cache`, `public`.
*   If `chown` cannot be applied (e.g., host bind mount that prevents chown), the entrypoint uses ACLs (`setfacl`) when available to give `www-data` and the host user read/write/execute permissions.
*   If ACLs aren't available, the entrypoint falls back to applying permissive directory (`2775`) and file (`0664`) permissions to make the directories writable on both the host and in the container.

This behavior is aimed at development environments only and helps ensure that files edited on the host are available and writable in the container without manual extra steps.

### Fixing host-side permissions (helper script)

If you run into permission issues editing files on the host, run one of these (choose based on whether your host supports ACLs):

1. Using setfacl (if available):

```bash
# Grant current user and www-data rwx on the host mount (best-effort)
sudo setfacl -R -m u:$(id -un):rwX -m u:www-data:rwX docker/local-storage || true
sudo setfacl -R -d -m u:$(id -un):rwX -m u:www-data:rwX docker/local-storage || true
```

1. Using chown+chmod (fallback):

```bash
# Make current user owner and allow host+group write access
sudo chown -R $(id -u):$(id -g) docker/local-storage
sudo chmod -R u+rwX,g+rwX,o-rwx docker/local-storage
```

Note: the script may request `sudo` for the fallback `chown` step and requires the `acl` tools to be installed for ACLs. Use this helper during development; do not run it in production unless you understand the implications.
    
