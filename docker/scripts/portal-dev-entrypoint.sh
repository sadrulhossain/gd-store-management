#!/bin/sh
# Development entrypoint: install dependencies when node_modules is empty, then start Next.js.
set -eu

if [ ! -x node_modules/.bin/next ]; then
    echo "[portal] installing dependencies..."
    npm ci
fi

exec npm run dev
