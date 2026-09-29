#!/usr/bin/env bash
# Build, push and deploy the Discovery Agent to Cloud Run. Run by Adam (needs a signed-in gcloud and Docker).
# One-time setup (service account, IAM, secrets) is in README.md.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gemini-enterprise-test-509310}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-gemini-discovery-agent}"
TAG="${TAG:-$(date -u +%Y%m%d-%H%M%S)}"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/sandbox-agents/${SERVICE}:${TAG}"
RUNTIME_SA="${RUNTIME_SA:-gemini-discovery-agent@${PROJECT_ID}.iam.gserviceaccount.com}"
GE_ENGINE="${GE_ENGINE:-projects/398896934586/locations/global/collections/default_collection/engines/gemini-enterprise-17899859_1789985955771}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash}"
GEMINI_CLASSIFIER_MODEL="${GEMINI_CLASSIFIER_MODEL:-gemini-3.5-flash-lite}"

cd "$(dirname "$0")"

docker build --platform linux/amd64 -t "${IMAGE}" .
docker push "${IMAGE}"

SECRETS="NOVU_SECRET_KEY=novu-secret-key:latest"
if gcloud secrets describe jev-api-key --project "${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},JEV_API_KEY=jev-api-key:latest"
else
  echo "Secret jev-api-key not found: deploying without Jev (Gemini fallback classifier only)."
fi

# --no-cpu-throttling: the bridge acks each Novu event immediately and the turn keeps running
# (Deep Research streams for ~8 min), so CPU must stay allocated after the response.
gcloud run deploy "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --service-account "${RUNTIME_SA}" \
  --allow-unauthenticated \
  --no-cpu-throttling \
  --timeout=3600 \
  --min-instances=1 \
  --max-instances=3 \
  --cpu=1 \
  --memory=512Mi \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GE_ENGINE=${GE_ENGINE},VERTEX_LOCATION=global,GEMINI_MODEL=${GEMINI_MODEL},GEMINI_CLASSIFIER_MODEL=${GEMINI_CLASSIFIER_MODEL}" \
  --set-secrets "${SECRETS}"

URL="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" --format 'value(status.url)')"
echo "Bridge URL: ${URL}/api/novu"
curl -fsS "${URL}/api/novu?action=health-check" && echo
