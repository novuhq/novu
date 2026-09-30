#!/usr/bin/env bash
# Build the demo agents image and create or update one Cloud Run service per persona, each invokable
# only by the Gemini Enterprise (Discovery Engine) service agent. Uses ADC; no gcloud config needed.
# Usage: ./deploy.sh [tag]
set -euo pipefail
cd "$(dirname "$0")"

PROJECT=gemini-enterprise-test-509310
PROJECT_NUMBER=398896934586
REGION=us-central1
IMAGE="$REGION-docker.pkg.dev/$PROJECT/sandbox-agents/a2a-demo-agents:${1:-v1}"
INVOKER="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-discoveryengine.iam.gserviceaccount.com"
PERSONAS=(people it_helpdesk finance analyst)
API="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/services"

TOKEN=$(gcloud auth application-default print-access-token)
auth=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
echo "$TOKEN" | docker login -u oauth2accesstoken --password-stdin "https://$REGION-docker.pkg.dev" >/dev/null
docker build -q --platform linux/amd64 -t "$IMAGE" . >/dev/null
docker push -q "$IMAGE" >/dev/null
DIGEST=$(docker inspect --format '{{index .RepoDigests 0}}' "$IMAGE")

for persona in "${PERSONAS[@]}"; do
  service="a2a-${persona//_/-}"
  url="https://$service-$PROJECT_NUMBER.$REGION.run.app"
  template=$(jq -n --arg image "$DIGEST" --arg agent "$persona" --arg url "$url" --arg serviceAccount "$PROJECT_NUMBER-compute@developer.gserviceaccount.com" '{
    scaling: { maxInstanceCount: 1 },
    timeout: "60s",
    serviceAccount: $serviceAccount,
    maxInstanceRequestConcurrency: 10,
    containers: [{
      image: $image,
      env: [{ name: "AGENT", value: $agent }, { name: "AGENT_URL", value: $url }],
      resources: { limits: { cpu: "1", memory: "256Mi" }, cpuIdle: true },
      ports: [{ name: "http1", containerPort: 8080 }]
    }]
  }')

  if curl -sf "${auth[@]}" "$API/$service" >/dev/null; then
    curl -sf -X PATCH "${auth[@]}" "$API/$service?updateMask=template" -d "{\"template\": $template}" >/dev/null
  else
    curl -sf -X POST "${auth[@]}" "$API?serviceId=$service" -d "{\"ingress\": \"INGRESS_TRAFFIC_ALL\", \"template\": $template}" >/dev/null
  fi

  until [ "$(curl -s "${auth[@]}" "$API/$service" | jq -r '.terminalCondition.state')" = "CONDITION_SUCCEEDED" ] &&
    [ "$(curl -s "${auth[@]}" "$API/$service" | jq -r '.reconciling // false')" = "false" ]; do
    sleep 5
  done

  curl -sf -X POST "${auth[@]}" "$API/$service:setIamPolicy" \
    -d "{\"policy\": {\"bindings\": [{\"role\": \"roles/run.invoker\", \"members\": [\"$INVOKER\"]}]}}" >/dev/null
  echo "$persona -> $url"
done
