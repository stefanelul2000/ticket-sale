FROM node:20-alpine AS frontend
WORKDIR /app
COPY app/frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY app/frontend ./frontend
RUN cd frontend && npm run build

FROM composer:2 AS vendor
WORKDIR /app
COPY app/backend/composer.json app/backend/composer.lock ./backend/
RUN cd backend && composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
COPY app/backend/database ./backend/database

FROM php:8.3-fpm-alpine
RUN apk add --no-cache \
    bash git unzip icu-dev oniguruma-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
    autoconf make gcc g++ nginx \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql gd intl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf make gcc g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

# Copy backend code
COPY app/backend/ ./
# Copy built frontend assets into public
COPY --from=frontend /app/frontend/dist/ ./public/
# Copy vendors
COPY --from=vendor /app/backend/vendor ./vendor

# Nginx config
RUN mkdir -p /run/nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Install composer from the official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Entrypoint to run migrations and start php-fpm
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
