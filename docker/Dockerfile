FROM node:20-alpine AS frontend
WORKDIR /app
COPY app/frontend/package*.json ./frontend/
RUN cd frontend && npm ci
# Ensure target public path exists for Vite outDir ../backend/public
RUN mkdir -p /app/backend/public
COPY app/frontend ./frontend
RUN cd frontend && npm run build

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
# Copy built frontend assets (Vite outDir is ../backend/public)
COPY --from=frontend /app/backend/public ./public
# Restore Laravel front controller (overwritten by Vite index.html copy)
COPY app/backend/public/index.php ./public/index.php

# Install composer binary then backend dependencies with autoload + discovery
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Nginx config
RUN mkdir -p /run/nginx
COPY docker/nginx.conf.main /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint to run migrations and start php-fpm
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
