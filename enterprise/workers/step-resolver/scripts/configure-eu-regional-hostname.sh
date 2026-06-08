#!/usr/bin/env bash
set -euo pipefail

# Configures Cloudflare Regional Services (Data Localization Suite) for the EU
# step-resolver custom domain so TLS termination and Worker execution stay in EU.
#
# Required env:
#   CLOUDFLARE_ZONE_ID       - Zone ID for novu.co
#   STEP_RESOLVER_CF_API_TOKEN - Cloudflare API token with Zone:Edit + DLS permissions
#
# Optional env:
#   STEP_RESOLVER_EU_HOSTNAME - default: eu.step-resolver.novu.co
#   STEP_RESOLVER_REGION_KEY  - default: eu

ZONE_ID="${CLOUDFLARE_ZONE_ID:?set CLOUDFLARE_ZONE_ID for the novu.co zone}"
CF_API_TOKEN="${STEP_RESOLVER_CF_API_TOKEN:?set STEP_RESOLVER_CF_API_TOKEN}"
HOSTNAME="${STEP_RESOLVER_EU_HOSTNAME:-eu.step-resolver.novu.co}"
REGION_KEY="${STEP_RESOLVER_REGION_KEY:-eu}"

echo "Configuring Regional Services for ${HOSTNAME} (region_key=${REGION_KEY})..."

response="$(curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/addressing/regional_hostnames" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"hostname\":\"${HOSTNAME}\",\"region_key\":\"${REGION_KEY}\"}")"

echo "${response}" | node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  if (!data.success) {
    console.error(JSON.stringify(data.errors ?? data, null, 2));
    process.exit(1);
  }
  console.log('Regional hostname configured:', JSON.stringify(data.result, null, 2));
"
