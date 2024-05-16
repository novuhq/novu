#!/bin/sh

set -e

echo "Downloading secrets for the local development environment..."
doppler secrets download --project nx --config dev --no-file --format env > nx-cloud.env

echo "Downloading secrets for the API..."
doppler secrets download --project api --config dev --no-file --format env > apps/api/src/.env

echo "All done! ✅"
