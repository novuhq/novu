# Novu Discovery Agent (Gemini Enterprise PoC)

One `@novu/framework` agent (`discovery-agent`) that employees talk to in Gemini Enterprise (via a Novu channel) and Slack. On each message it forwards to one agent from a fixed list, or answers directly with Gemini and asks which agent the user means. It forwards to the target agents in the Google sandbox as its own identity (ADC).

Standalone npm project (excluded from the pnpm workspace). Node 24 runs the TypeScript directly; there is no build step.

## Layout

| Path | What |
| --- | --- |
| `src/server.ts` | Entry point: Express + `serve()` from `@novu/framework/express` at `/api/novu` |
| `src/agent.ts` | Start reading here. `onMessage`: classify, then forward or answer directly |
| `src/classify.ts` | Gemini Flash-Lite picks an agent (or `direct`) with a confidence |
| `src/answer.ts` | Gemini direct answer: greetings, help, clarifying question |
| `src/prompt.ts` | Shared prompt pieces: agent list, recent conversation |
| `src/forward/` | `forward()` to an agent: `a2a-proxy.ts` (A2A agents), `stream-assist.ts` (Deep Research, Core Assistant) |
| `src/google.ts` | Authenticated POST to Google APIs, and Gemini `generateContent` |
| `src/config.ts` | Env vars and `agents.json` |
| `agents.json` | Fixed candidate list |
| `demo-agents/` | Canned A2A department agents (Sales, People, IT Helpdesk, Finance, Analyst) on Cloud Run |

## Environment

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NOVU_SECRET_KEY` | yes | | Novu environment secret key; the framework posts agent events with it. |
| `GOOGLE_CLOUD_PROJECT` | yes | | `gemini-enterprise-test-509310`. Also sent as `x-goog-user-project`. |
| `GE_ENGINE` | yes | | `projects/398896934586/locations/global/collections/default_collection/engines/gemini-enterprise-17899859_1789985955771` |
| `PORT` | no | `8080` | `4111` for `npm run dev` |
| `NOVU_API_URL` | no | `https://api.novu.co` | Read by `novu dev`; `http://localhost:3000` for a local API |
| `VERTEX_LOCATION` | no | `global` | |
| `GEMINI_MODEL` | no | `gemini-3.5-flash` | Direct answers |
| `GEMINI_CLASSIFIER_MODEL` | no | `gemini-3.5-flash-lite` | Router (JSON schema, `thinkingLevel: MINIMAL`) |
| `AGENTS_FILE` | no | `./agents.json` | |

Google auth uses ADC (`~/.config/gcloud/application_default_credentials.json`).

## Run locally

```sh
cd playground/gemini-discovery-agent
npm install --workspaces=false
npm run dev
```

`npm run dev` reads `.env`, starts the server, opens a `novu dev` tunnel, and sets the tunnel as `discovery-agent`'s dev bridge. `npm run typecheck` checks types.

## Routing

State lives in conversation metadata under `route`: `{ current, sessions: { <agentId>: <GE session> } }`.

1. Every message is classified with the current agent as context, so follow-ups ("March", "Start Research") stay with it and naming another agent's topic switches.
2. Gemini Flash-Lite returns `{agent, confidence}` over every agent plus `direct`. `high` forwards; anything else gets a direct Gemini answer, which asks which agent the user means when the message could fit more than one.
3. A failed forward replies with "Open @Agent in Gemini Enterprise" text.

Every decision is one JSON log line (`route`, `forward`, `forward_failed`).

## Agent list

`agents.json` holds: `deep_research` (Deep Research, `stream_assist`), `web_search` (the Core Assistant with Google Search: `stream_assist` with `targetId: default_assistant`, which sends no `agentsSpec`), and the five agents from `demo-agents/` (`sales`, `people`, `it_helpdesk`, `finance`, `analyst`, all `a2a_proxy`). `streamAssist` silently falls back to the default assistant on an unknown agent id, so check `targetId`s.

`demo-agents/` is one A2A server image; `AGENT` picks the persona (`personas.ts`). `./deploy.sh [tag]` builds it and creates or updates one private Cloud Run service per persona (`a2a-<persona>`), invokable only by the Gemini Enterprise service agent. `node register.ts` registers or updates each one in the engine, shares it with all users, and prints its `agents.json` entry. Each agent asks one follow-up question (month, kind of leave, system, expense report, quarter) to show multi-turn forwarding.

## Framework notes

- `@novu/framework@2.14.0` is event mode only: replies, metadata and typing are posted to `eventsUrl` with `Authorization: ApiKey <NOVU_SECRET_KEY>`.
- The bridge answers `{"status":"ack"}` immediately and the handler keeps running in the process.
- The published ESM statically imports `zod` and eagerly imports `zod-to-json-schema` (both listed as optional peers), so both are dependencies here.
