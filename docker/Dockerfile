# syntax=docker/dockerfile:1.7
# One multi-stage Dockerfile for every image. Build context: repository root.

ARG PHP_VERSION=8.4
ARG ALPINE_VERSION=3.24
ARG NODE_VERSION=24
ARG NGINX_VERSION=1.30.6
ARG COMPOSER_VERSION=2.9

FROM composer:${COMPOSER_VERSION} AS composer-bin

# ---------------------------------------------------------------- PHP / API
FROM php:${PHP_VERSION}-fpm-alpine${ALPINE_VERSION} AS php-base
ARG APP_UID=1000
ARG APP_GID=1000
ENV PHP_FPM_MAX_CHILDREN=10

RUN set -eux; \
    apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS freetype-dev libjpeg-turbo-dev libpng-dev libwebp-dev \
        libzip-dev icu-dev postgresql-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql pgsql gd exif zip bcmath intl opcache pcntl; \
    runDeps="$(scanelf --needed --nobanner --format '%n#p' --recursive /usr/local/lib/php/extensions \
        | tr ',' '\n' | sort -u \
        | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }')"; \
    apk add --no-cache --virtual .runtime-deps $runDeps fcgi; \
    apk del .build-deps; \
    addgroup -g "${APP_GID}" app; \
    adduser -D -u "${APP_UID}" -G app -s /bin/sh app; \
    mkdir -p /var/www/html/vendor /var/www/html/storage/app/public /var/www/html/storage/app/private; \
    chown -R app:app /var/www/html

COPY --from=composer-bin /usr/bin/composer /usr/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-store.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/zz-docker.conf
COPY docker/scripts/api-entrypoint.sh docker/scripts/healthcheck-api.sh /usr/local/bin/
RUN rm -f /usr/local/etc/php-fpm.d/www.conf /usr/local/etc/php-fpm.d/www.conf.default \
          /usr/local/etc/php-fpm.d/docker.conf \
    && chmod +x /usr/local/bin/api-entrypoint.sh /usr/local/bin/healthcheck-api.sh

WORKDIR /var/www/html
ENTRYPOINT ["api-entrypoint.sh"]
CMD ["php-fpm"]

FROM php-base AS api-dev
ENV APP_ENV=local
USER app

FROM php-base AS api-build
COPY api/composer.json api/composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache,uid=0 \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist
COPY api/ ./
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative --no-interaction \
    && rm -rf storage/app/* storage/logs/* \
    && mkdir -p storage/app/public storage/app/private storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

FROM php-base AS api-prod
ENV APP_ENV=production APP_DEBUG=false
COPY docker/php/opcache-prod.ini /usr/local/etc/php/conf.d/zz-opcache-prod.ini
COPY --from=api-build --chown=app:app /var/www/html/ /var/www/html/
USER app

# ---------------------------------------------------------------- Portal
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS node-base
RUN apk add --no-cache libc6-compat \
    && mkdir -p /app/node_modules /app/.next \
    && chown -R node:node /app
WORKDIR /app
COPY docker/scripts/portal-dev-entrypoint.sh /usr/local/bin/portal-dev-entrypoint.sh
RUN chmod +x /usr/local/bin/portal-dev-entrypoint.sh

FROM node-base AS portal-dev
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
USER node
CMD ["portal-dev-entrypoint.sh"]

FROM node-base AS portal-build
ENV NEXT_TELEMETRY_DISABLED=1
COPY portal/package.json portal/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY portal/ ./
RUN npm run build

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS portal-prod
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=portal-build --chown=node:node /app/.next/standalone ./
COPY --from=portal-build --chown=node:node /app/.next/static ./.next/static
COPY --from=portal-build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# ---------------------------------------------------------------- Gateway
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine${ALPINE_VERSION} AS nginx-gateway
ENV UPLOAD_MAX_SIZE=5M API_FASTCGI_UPSTREAM=store-api:9000 PORTAL_UPSTREAM=store-portal:3000
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080

FROM nginx-gateway AS nginx-gateway-prod
COPY --from=api-build /var/www/html/public /var/www/html/public
