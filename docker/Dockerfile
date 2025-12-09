FROM node:20-alpine AS frontend
WORKDIR /app

# Install frontend dependencies
COPY app/frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Ensure target public path exists for Vite outDir ../backend/public
RUN mkdir -p /app/backend/public

# Copy full frontend source
COPY app/frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# ------------------------------
# PHP + NGINX + Runtime Config Stage
# ------------------------------
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    bash git unzip icu-dev oniguruma-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
    autoconf make gcc g++ nginx \
    acl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql gd intl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf make gcc g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

# Copy composer.json and composer.lock for dependency installation
COPY app/backend/composer.json ./composer.json
COPY app/backend/composer.lock ./composer.lock

# Install Composer and backend dependencies
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copy the rest of the backend (Laravel) code
COPY app/backend/ ./

# Copy built frontend assets
COPY --from=frontend /app/backend/public ./public

# Restore Laravel front controller
COPY app/backend/public/index.php ./public/index.php

# Nginx config
RUN mkdir -p /run/nginx
COPY docker/nginx.conf.main /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy docker-specific env example into the webroot so the entrypoint finds it
COPY docker/.env.example /var/www/html/.env.example

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Always generate swagger at build time, unless explicitly disabled.
# Default APP_URL can be provided at build time using --build-arg APP_URL
ARG APP_URL=http://localhost:8080
ENV APP_URL=${APP_URL}
# Always generate swagger during image build to ensure docs are present
RUN echo "Generating L5 Swagger JSON at build time (APP_URL=${APP_URL})"; \
        php artisan l5-swagger:generate || true; \
        chown -R www-data:www-data /var/www/html/storage/api-docs || true;

EXPOSE 80

CMD ["/entrypoint.sh"]