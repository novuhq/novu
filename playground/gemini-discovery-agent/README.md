# Novu Discovery Agent (Gemini Enterprise PoC)

One `@novu/framework` agent (`discovery-agent`) that employees talk to in Gemini Enterprise (via a Novu channel) and Slack. On each message it stays with the current target agent, switches to another agent from a fixed list, answers directly with Gemini, or asks the user to pick with a choice card. It forwards to the target agents in the Google sandbox as its own identity (ADC locally, the Cloud Run service account in production).

Standalone npm project (excluded from the pnpm workspace). Node 24 runs the TypeScript directly; there is no build step.

## Layout

| Path | What |
| --- | --- |
| `src/server.ts` | Express + `serve()` from `@novu/framework/express` at `/api/novu` |
| `src/agent.ts` | `onMessage` / `onAction`: routing, forwarding, replies, choice cards, "Change agent" |
| `src/route/policy.ts` | Pure routing decision and the `route` metadata shape |
| `src/route/classify.ts`, `jev.ts`, `gemini.ts` | Jev scoring, Gemini fallback classifier, Gemini direct answers |
| `src/forward/a2a-proxy.ts`, `stream-assist.ts` | Discovery Engine A2A proxy and `streamAssist` (Deep Research) |
| `agents.json` | Fixed candidate list (validated at startup) |
| `scripts/` | `write-agent-list.ts`, `smoke-forward.ts`, `smoke-route.ts`, `smoke-bridge.ts` |
| `artifacts/` | Output of the smoke scripts |

## Environment

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NOVU_SECRET_KEY` | yes (server) | | Novu environment secret key. Used to verify bridge HMAC (only when `NODE_ENV=production`) and to post agent events to Novu. |
| `GOOGLE_CLOUD_PROJECT` | yes | | `gemini-enterprise-test-509310`. Also sent as `x-goog-user-project`. |
| `GE_ENGINE` | yes | | `projects/398896934586/locations/global/collections/default_collection/engines/gemini-enterprise-17899859_1789985955771` |
| `PORT` | no | `8080` | |
| `VERTEX_LOCATION` | no | `global` | |
| `GEMINI_MODEL` | no | `gemini-3.5-flash` | Direct answers |
| `GEMINI_CLASSIFIER_MODEL` | no | `gemini-3.5-flash-lite` | Fallback router (JSON schema, `thinkingLevel: MINIMAL`) |
| `JEV_API_KEY` | no | | Without it every message uses the Gemini fallback router |
| `JEV_API_URL` | no | `https://jevtypesafeai.com/api/v1/decide` | |
| `AGENTS_FILE` | no | `./agents.json` | |
| `NODE_ENV` | no | | `production` in the Docker image (turns HMAC on). Leave unset locally. |

Google auth uses `google-auth-library`: ADC locally (`~/.config/gcloud/application_default_credentials.json`), the metadata server on Cloud Run. `gcloud` itself is not needed for local runs.

## Run locally

```sh
cd playground/gemini-discovery-agent
npm install --workspaces=false
export GOOGLE_CLOUD_PROJECT=gemini-enterprise-test-509310
export GE_ENGINE=projects/398896934586/locations/global/collections/default_collection/engines/gemini-enterprise-17899859_1789985955771
NOVU_SECRET_KEY=<novu secret key> npm start
curl "http://localhost:8080/api/novu?action=health-check"
```

To connect a local server to Novu, expose it with a tunnel (for example `npx novu@latest dev --port 8080 --route /api/novu`) and set the agent's bridge URL to `<tunnel>/api/novu`.

Checks (all real calls, no mocks):

```sh
./node_modules/.bin/tsc --noEmit             # or npm run typecheck (npx picks the repo-root tsc 5.6)
node scripts/smoke-forward.ts                # A2A proxy: question, then answer on the saved session
node scripts/smoke-forward.ts --deep-research  # + ONE Deep Research plan turn (uses quota, never "Start Research")
node scripts/smoke-route.ts                  # classifier + policy on the demo phrases
node scripts/smoke-bridge.ts                 # needs npm start; drives turns through the framework with a local fake eventsUrl
```

## Routing

State lives in conversation metadata under `route`: `{ current, waiting, sessions: { <agentId>: <GE session> }, lastForwarded, pending }`.

1. `waiting` set: forward to that agent on its session, no classifier.
2. Otherwise Jev scores every agent plus `direct`. Top agent >= 0.70 forwards; `direct` >= 0.60 answers with Gemini; anything else shows a choice card with the top 2 or 3 agents.
3. Jev unavailable: Gemini Flash-Lite returns `{agent, confidence}`. `high` forwards (or answers directly); otherwise the card.
4. An agent question (`mock_function_call_for_required_user_input`) is posted as the reply and sets `waiting`. Any answer with text clears it. A Deep Research plan is a normal answer, so "Start Research" is classified (it routes to the current agent).
5. Every forwarded answer carries a "Change agent" button. It clears `waiting` and opens a card over all agents; the pick re-sends the last forwarded message.
6. A failed forward replies with an "Open @Agent" card only.

Every decision is one JSON log line (`route_decision`, `forward_result`, `forward_failed`, `choice_picked`, `change_agent`).

## Agent list

`agents.json` holds the demo list: `deep_research` (Deep Research, `stream_assist`) and `sales` (Novu A2A Test Agent `11935712447824575282`, `a2a_proxy`). Only ids in this file are ever forwarded: `streamAssist` silently falls back to the default assistant on an unknown agent id.

To regenerate from the engine (Owner ADC; keeps hand-picked local ids such as `sales`):

```sh
node scripts/write-agent-list.ts --out agents.json
```

It keeps ENABLED A2A agents and `deep_research`, and skips workflow and private agents. Remove agents you don't want routed (for example `Render Stub`) and tune descriptions: they are what the router reads.

## Deploy (Cloud Run)

`./deploy.sh` builds a linux/amd64 image, pushes it to `us-central1-docker.pkg.dev/gemini-enterprise-test-509310/sandbox-agents/gemini-discovery-agent:<tag>`, and deploys `gemini-discovery-agent` in us-central1 with CPU always allocated, a 3600 s timeout and one warm instance. It prints the bridge URL (`https://<service-url>/api/novu`). Overrides: `TAG`, `PROJECT_ID`, `REGION`, `RUNTIME_SA`, `GEMINI_MODEL`, `GEMINI_CLASSIFIER_MODEL`.

### One-time setup

```sh
PROJECT_ID=gemini-enterprise-test-509310
SA=gemini-discovery-agent@${PROJECT_ID}.iam.gserviceaccount.com

gcloud auth login && gcloud config set project ${PROJECT_ID}
gcloud auth configure-docker us-central1-docker.pkg.dev

# Runtime service account
gcloud iam service-accounts create gemini-discovery-agent --display-name "Novu Discovery Agent"
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member "serviceAccount:${SA}" --role roles/discoveryengine.user
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member "serviceAccount:${SA}" --role roles/aiplatform.user

# Secrets (the Jev secret is optional)
printf '%s' '<novu secret key>' | gcloud secrets create novu-secret-key --data-file=-
printf '%s' '<jev api key>' | gcloud secrets create jev-api-key --data-file=-
for s in novu-secret-key jev-api-key; do
  gcloud secrets add-iam-policy-binding $s --member "serviceAccount:${SA}" --role roles/secretmanager.secretAccessor
done
```

- The Artifact Registry repo `sandbox-agents` already exists.
- `--allow-unauthenticated` is required because Novu calls the bridge over the internet. Requests are authenticated by the Novu HMAC signature (`NODE_ENV=production` in the image). If an org policy blocks `allUsers`, the deploy step fails at the IAM binding.
- `roles/discoveryengine.user` was enough for the A2A proxy and Deep Research with a service account and no Gemini Enterprise licence (NV-8872). Proxy sessions land in this service account's Gemini Enterprise history.
- Cost: one always-on 1 vCPU / 512 MiB instance, roughly $45-50/month, plus Vertex AI tokens.

## Framework notes

- `@novu/framework@2.14.0` is event mode only: each bridge request must carry `eventsUrl`. Replies, cards, `ctx.choose` cards, metadata and typing are posted to `eventsUrl` with `Authorization: ApiKey <NOVU_SECRET_KEY>`, not to `replyUrl`.
- The bridge answers `{"status":"ack"}` immediately and the handler keeps running in the process. Cloud Run therefore needs `--no-cpu-throttling`.
- `ctx.choose` and `ctx.metadata.set` are queued and sent with the next reply or when the handler ends.
- The published ESM statically imports `zod` and eagerly imports `zod-to-json-schema` (both listed as optional peers), so both are dependencies here.
