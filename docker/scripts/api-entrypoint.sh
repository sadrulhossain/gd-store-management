#!/bin/sh
# Shared entrypoint for the api, worker and scheduler containers.
set -eu

cd /var/www/html
log() { echo "[entrypoint] $*"; }
is_production() { [ "${APP_ENV:-production}" = "production" ]; }

# --- Production sanity checks: refuse to start with example or missing secrets.
if is_production; then
    [ -n "${APP_KEY:-}" ] || { log "APP_KEY is required in production"; exit 1; }
    [ "${DB_PASSWORD:-}" != "change-me" ] && [ -n "${DB_PASSWORD:-}" ] \
        || { log "DB_PASSWORD must be set to a real secret in production"; exit 1; }
fi

# --- Dependencies (development only: production images ship vendor/).
if [ ! -f vendor/autoload.php ]; then
    if is_production; then
        log "vendor/ is missing from the production image"; exit 1
    fi
    log "installing composer dependencies..."
    composer install --no-interaction --prefer-dist
fi

# --- Wait for the database.
log "waiting for database ${DB_HOST:-store-postgres}:${DB_PORT:-5432}..."
attempts=0
until php -r '
    $dsn = sprintf("pgsql:host=%s;port=%s;dbname=%s", getenv("DB_HOST"), getenv("DB_PORT") ?: "5432", getenv("DB_DATABASE"));
    try { new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD")); } catch (Throwable $e) { exit(1); }
' ; do
    attempts=$((attempts + 1))
    [ "$attempts" -lt 60 ] || { log "database not reachable"; exit 1; }
    sleep 2
done

# --- App key (development only): persisted in api/.env, shared by all three containers.
if [ -z "${APP_KEY:-}" ]; then
    unset APP_KEY
    [ -f .env ] || cp .env.example .env
    if ! grep -qE '^APP_KEY=.+' .env; then
        log "generating application key"
        php artisan key:generate --force --no-interaction
    fi
fi

# --- Passport keys (development only): production supplies them via environment.
if [ -z "${PASSPORT_PRIVATE_KEY:-}" ] && php artisan list --raw 2>/dev/null | grep -q '^passport:keys'; then
    if is_production; then
        log "PASSPORT_PRIVATE_KEY and PASSPORT_PUBLIC_KEY are required in production"; exit 1
    fi
    if [ ! -f storage/oauth-private.key ]; then
        log "generating development Passport keys"
        php artisan passport:keys --no-interaction
    fi
fi

# --- Storage layout and permissions.
mkdir -p storage/app/public storage/app/private storage/framework/cache/data \
    storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
if [ "$(id -u)" = "0" ]; then
    # Development bind mounts are root-owned; let the php-fpm "app" workers write.
    chmod -R a+rwX storage bootstrap/cache 2>/dev/null || true
else
    chmod -R ug+rwX storage bootstrap/cache 2>/dev/null || true
fi

# --- Migrations: only the container with RUN_MIGRATIONS=true.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    log "running migrations"
    php artisan migrate --force --no-interaction

    # Ensure the portal's Passport client exists (idempotent). Development generates
    # missing credentials into api/.env; production takes them from the environment.
    if is_production; then
        if [ -n "${PASSPORT_PORTAL_CLIENT_ID:-}" ]; then
            php artisan store:passport-client --no-interaction
        fi
    else
        php artisan store:passport-client --write-env --no-interaction
    fi
fi

# --- Production caches.
if is_production; then
    log "caching config and routes"
    php artisan config:cache --no-interaction
    php artisan route:cache --no-interaction
    # The API has no Blade views today; cache them only once a module adds some.
    if [ -d resources/views ]; then
        php artisan view:cache --no-interaction
    fi
fi

exec "$@"
