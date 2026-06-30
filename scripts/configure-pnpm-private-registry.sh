#!/usr/bin/env bash
set -euo pipefail

# pnpm 11.9+ ignores env-var placeholders in project .npmrc auth settings.
# Write credentials to the active user npmrc (respects NPM_CONFIG_USERCONFIG).
if [ -n "${BULL_MQ_PRO_NPM_TOKEN:-}" ]; then
  npmrc="${NPM_CONFIG_USERCONFIG:-${HOME}/.npmrc}"
  mkdir -p "$(dirname "$npmrc")"
  printf '@taskforcesh:registry=https://npm.taskforce.sh/\n//npm.taskforce.sh/:_authToken=%s\nalways-auth=true\n' \
    "${BULL_MQ_PRO_NPM_TOKEN}" > "$npmrc"
  chmod 600 "$npmrc"
fi

# pnpm 11.9 verifies every lockfile entry on install. Trust the committed lockfile
# in CI so installs are not blocked by minimumReleaseAge on unrelated packages.
printf '%s' "--config.trustLockfile=true"
