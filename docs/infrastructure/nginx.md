# Nginx Configuration

This document describes the Nginx web server configuration used within the Dockerized application, based on `nginx.conf` and `nginx.conf.main`.

## Configuration Details

*   **Listen:** Nginx listens on port `80` within the container.
*   **Document Root:** The web server serves files from `/var/www/html/public`.
*   **Request Handling (Laravel SPA/API):** All requests are routed through Laravel's `index.php` for both API handling and serving the Single Page Application (SPA). This is managed by the `try_files $uri $uri/ /index.php?$query_string;` directive.
*   **PHP Processing:** PHP requests (e.g., `*.php`) are passed to the PHP-FPM service, which is typically running at `127.0.0.1:9000` within the container.