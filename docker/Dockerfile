# syntax=docker/dockerfile:1

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend
WORKDIR /app
COPY app/frontend/package*.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY app/frontend ./frontend
RUN mkdir -p backend/public && cd frontend && BUILD_TO_BACKEND=true npm run build

# ---------- Runtime base ----------
FROM alpine:3.21 AS base

ARG S6_VERSION=3.2.1.0

ENV PUID=1000 \
    PGID=1000 \
    TZ=UTC \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=300000

WORKDIR /var/www

RUN set -eux; \
    apk add --no-cache \
      bash curl nginx shadow tzdata ca-certificates unzip xz \
      php82 php82-ctype php82-curl php82-dom php82-fpm php82-fileinfo php82-iconv \
      php82-gd php82-mbstring php82-opcache php82-openssl php82-phar php82-pdo \
      php82-pdo_mysql php82-pecl-redis php82-session php82-simplexml php82-tokenizer \
      php82-xml php82-xmlwriter php82-zip php82-intl php82-bcmath \
      icu-data-full icu-libs; \
    ln -sf /usr/bin/php82 /usr/bin/php; \
    if ! getent group www-data > /dev/null; then addgroup -S www-data; fi; \
    if ! getent passwd www-data > /dev/null; then adduser -S -D -H -G www-data www-data; fi; \
    mkdir -p /run/php

ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-noarch.tar.xz /tmp/
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-x86_64.tar.xz /tmp/
RUN set -eux; \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz; \
    tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz; \
    rm /tmp/s6-overlay-*.tar.xz

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY app/backend/composer.json app/backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY app/backend/ ./
COPY --from=frontend /app/backend/public ./public
COPY app/backend/public/index.php ./public/index.php

RUN set -eux; \
    rm -f .env; \
    mkdir -p storage/app/public storage/framework/sessions storage/framework/cache/data storage/framework/views storage/logs bootstrap/cache; \
    composer dump-autoload --no-dev --optimize --classmap-authoritative; \
    php artisan package:discover --ansi

COPY docker/php/www.conf /etc/php82/php-fpm.d/www.conf
COPY docker/php/99-app.ini /etc/php82/conf.d/99-app.ini
COPY docker/nginx.conf.main /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint.sh /docker/entrypoint.sh
COPY docker/rootfs /

RUN set -eux; \
    rm -f /etc/nginx/conf.d/default.conf; \
    mkdir -p /var/log/nginx /run/nginx; \
    ln -sfn /var/www /var/www/html; \
    chmod +x /docker/entrypoint.sh /etc/s6-overlay/scripts/*.sh; \
    find /etc/s6-overlay -type f \( -name run -o -name up \) -exec chmod +x {} +; \
    php artisan l5-swagger:generate || true; \
    ln -sfn /var/www/storage/app/public public/storage; \
    # Code stays root-owned (read-only for php-fpm); only runtime dirs are writable.
    chown -R root:root /var/www; \
    chmod -R go-w /var/www; \
    chown -R www-data:www-data storage bootstrap/cache

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1/api/health || exit 1

EXPOSE 80
ENTRYPOINT ["/init"]

# ---------- Test image: `docker build --target test .` then run `php artisan test` ----------
FROM base AS test
RUN set -eux; \
    apk add --no-cache php82-pdo_sqlite php82-sqlite3; \
    composer install --no-interaction --prefer-dist --no-scripts; \
    touch .env; \
    php artisan package:discover --ansi
ENTRYPOINT []
CMD ["php", "artisan", "test"]

# ---------- Production image (default target) ----------
FROM base AS app
