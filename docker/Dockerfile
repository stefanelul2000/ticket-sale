FROM node:20-alpine AS frontend
WORKDIR /app

COPY app/frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY app/frontend ./frontend
RUN cd frontend && BUILD_TO_BACKEND=true npm run build

FROM alpine:3.21

ARG S6_VERSION=3.2.1.0
ARG APP_URL=http://localhost:8080

ENV PUID=1000 \
    PGID=1000 \
    TZ=UTC \
    APP_URL=${APP_URL}

WORKDIR /var/www

RUN set -eux; \
    apk add --no-cache \
      bash \
      curl \
      git \
      nginx \
      shadow \
      tzdata \
      ca-certificates \
      php82 \
      php82-ctype \
      php82-curl \
      php82-dom \
      php82-fpm \
      php82-fileinfo \
      php82-iconv \
      php82-gd \
      php82-mbstring \
      php82-opcache \
      php82-openssl \
      php82-phar \
      php82-pdo \
      php82-pdo_mysql \
      php82-pecl-redis \
      php82-session \
      php82-simplexml \
      php82-tokenizer \
      php82-xml \
      php82-xmlwriter \
      php82-zip \
      unzip \
      icu-data-full \
      icu-libs && \
    ln -sf /usr/bin/php82 /usr/bin/php && \
    if ! getent group www-data > /dev/null; then addgroup -S www-data; fi && \
    if ! getent passwd www-data > /dev/null; then adduser -S -D -H -G www-data www-data; fi && \
    mkdir -p /run/php

ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-noarch.tar.xz /tmp/
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-x86_64.tar.xz /tmp/

RUN set -eux; \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz; \
    tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz; \
    rm /tmp/s6-overlay-*.tar.xz

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY app/backend/composer.json ./composer.json
COPY app/backend/composer.lock ./composer.lock
RUN set -eux; \
    composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY app/backend/ ./
COPY --from=frontend /app/backend/public ./public
COPY app/backend/public/index.php ./public/index.php
COPY docker/runtime-config.template.js ./public/config.js
RUN set -eux; \
    mkdir -p storage/framework/sessions storage/framework/cache/data storage/framework/views bootstrap/cache

RUN set -eux; \
    sed -i 's/^user = .*/user = www-data/' /etc/php82/php-fpm.d/www.conf; \
    sed -i 's/^group = .*/group = www-data/' /etc/php82/php-fpm.d/www.conf; \
    sed -i 's|^listen = .*|listen = /run/php-fpm.sock|' /etc/php82/php-fpm.d/www.conf; \
    sed -i 's/^;*listen.owner = .*/listen.owner = www-data/' /etc/php82/php-fpm.d/www.conf; \
    sed -i 's/^;*listen.group = .*/listen.group = nginx/' /etc/php82/php-fpm.d/www.conf; \
    sed -i 's/^;*listen.mode = .*/listen.mode = 0660/' /etc/php82/php-fpm.d/www.conf; \
    mkdir -p /var/log/nginx /run/nginx; \
    ln -sf /var/www /var/www/html

COPY docker/nginx.conf.main /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY docker/entrypoint.sh /docker/entrypoint.sh
RUN chmod +x /docker/entrypoint.sh

COPY docker/rootfs /

RUN set -eux; \
    find /etc/s6-overlay -type f \( -name run -o -name up \) -exec chmod +x {} +; \
    chmod +x /etc/s6-overlay/scripts/*.sh; \
    php artisan l5-swagger:generate || true; \
    chown -R www-data:www-data /var/www

EXPOSE 80

ENTRYPOINT ["/init"]
