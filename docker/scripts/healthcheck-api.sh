#!/bin/sh
# Calls GET /api/v1/health on the local PHP-FPM over FastCGI.
set -eu

response="$(SCRIPT_NAME=/index.php \
    SCRIPT_FILENAME=/var/www/html/public/index.php \
    REQUEST_URI=/api/v1/health \
    REQUEST_METHOD=GET \
    SERVER_PROTOCOL=HTTP/1.1 \
    HTTP_ACCEPT=application/json \
    cgi-fcgi -bind -connect 127.0.0.1:9000)"

case "$response" in
    *'"status":"ok"'*) exit 0 ;;
    *) echo "$response" >&2; exit 1 ;;
esac
