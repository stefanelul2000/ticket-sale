# Docker Infrastructure

This document details the Docker-related configuration for the project, including services, ports, and volumes defined in `docker-compose.yml` and built via `Dockerfile`.

## Services

*   `app`: Main application service (Laravel, Nginx, PHP-FPM) built from the Dockerfile, depends on `db` and `redis`.
*   `db`: MySQL 8.0 database service.
*   `redis`: Redis 7-alpine cache/queue service.

## Ports

*   `app`: Host port `8080` maps to container port `80`.
*   `db`: Host port `3306` maps to container port `3306`.
*   `redis`: Host port `6379` maps to container port `6379`.

## Volumes

*   `app` service:
    *   `/host/path/ticket-sale/storage` (host) -> `/var/www/html/storage` (container) - for Laravel's persistent storage.
    *   `/host/path/ticket-sale/config` (host) -> `/config` (container) - for runtime configuration.
*   `db` service:
    *   `db-data` (named volume) -> `/var/lib/mysql` (container) - for persistent MySQL data.