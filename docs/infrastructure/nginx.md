# Nginx Configuration

This document describes the Nginx web server configuration used within the Dockerized application, based on `nginx.conf` and `nginx.conf.main`.

## Configuration Details

*   **Listen:** Nginx listens on port `80` within the container.
*   **Document Root:** The web server serves files from `/var/www/html/public`.
*   **Request Handling (Laravel SPA/API):** All requests are routed through Laravel's `index.php` for both API handling and serving the Single Page Application (SPA). This is managed by the `try_files $uri $uri/ /index.php?$query_string;` directive.
*   **PHP Processing:** PHP requests (e.g., `*.php`) are passed to the PHP-FPM service listening on the Unix socket `/run/php-fpm.sock` (managed by s6-overlay). This replaces the older TCP `127.0.0.1:9000` target.
*   **Logging:** Access logs write to `/var/log/nginx/access.log` and error logs to `/var/log/nginx/error.log`. Because `/var/log` is bind-mounted to the host, you can tail these files directly outside the container (while still letting Docker capture stdout/stderr via the compose logs).
