FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    bash git unzip icu-dev oniguruma-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
    autoconf make gcc g++ \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo_mysql gd intl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf make gcc g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

# Install composer from the official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
