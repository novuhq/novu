#!/usr/bin/env bash
set -euo pipefail

# Configures Cloudflare Regional Services (Data Localization Suite) for the EU
# step-resolver custom domain so TLS termination and Worker execution stay in EU.
#
# Required env:
#   CLOUDFLARE_ZONE_ID       - Zone ID for novu.co
#   STEP_RESOLVER_CF_API_TOKEN - Cloudflare API token with DNS Write + DLS permissions
#
# Optional env:
#   STEP_RESOLVER_EU_HOSTNAME - default: eu.step-resolver.novu.co
#   STEP_RESOLVER_REGION_KEY  - default: eu

ZONE_ID="${CLOUDFLARE_ZONE_ID:?set CLOUDFLARE_ZONE_ID for the novu.co zone}"
CF_API_TOKEN="${STEP_RESOLVER_CF_API_TOKEN:?set STEP_RESOLVER_CF_API_TOKEN}"
EU_HOSTNAME="${STEP_RESOLVER_EU_HOSTNAME:-eu.step-resolver.novu.co}"
REGION_KEY="${STEP_RESOLVER_REGION_KEY:-eu}"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

echo "Configuring Regional Services for ${EU_HOSTNAME} (region_key=${REGION_KEY})..."

request_body="$(EU_HOSTNAME="$EU_HOSTNAME" REGION_KEY="$REGION_KEY" node -e "
  console.log(JSON.stringify({
    hostname: process.env.EU_HOSTNAME,
    region_key: process.env.REGION_KEY,
  }));
")"

http_code="$(curl -sS -o "$response_file" -w '%{http_code}' -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/addressing/regional_hostnames" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$request_body")"

RESPONSE_FILE="$response_file" HTTP_CODE="$http_code" node -e "
  const fs = require('fs');
  const body = fs.readFileSync(process.env.RESPONSE_FILE, 'utf8');
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    console.error('Non-JSON response (HTTP ' + process.env.HTTP_CODE + '):', body);
    process.exit(1);
  }

  if (!data.success) {
    console.error(JSON.stringify(data.errors ?? data, null, 2));
    process.exit(1);
  }

  console.log('Regional hostname configured:', JSON.stringify(data.result, null, 2));
"
