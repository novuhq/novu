#!/usr/bin/env bash
set -euo pipefail

# pnpm 11.9+ ignores env-var placeholders in project .npmrc auth settings.
# Write credentials to user-level config instead (see GHSA-3qhv-2rgh-x77r mitigation).
if [ -n "${BULL_MQ_PRO_NPM_TOKEN:-}" ]; then
  pnpm config set "@taskforcesh:registry" "https://npm.taskforce.sh/" --location global
  pnpm config set "//npm.taskforce.sh/:_authToken" "${BULL_MQ_PRO_NPM_TOKEN}" --location global
  printf '%s' ""
else
  printf '%s' "--config.trustLockfile=true"
fi
