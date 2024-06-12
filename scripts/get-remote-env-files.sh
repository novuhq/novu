#!/bin/sh

set -e

echo "Downloading secrets for the local development environment..."
doppler secrets download --project nx --config dev --no-file --format env > nx-cloud.env

echo "Downloading secrets for the API..."
doppler secrets download --project api --config dev --no-file --format env > apps/api/src/.env

echo "Downloading secrets for the Worker..."
doppler secrets download --project worker --config dev --no-file --format env > apps/worker/src/.env

echo "Downloading secrets for the Web app..."
doppler secrets download --project web --config dev --no-file --format env > apps/web/.env.local


echo "All done! ✅"
