# Novu Envoy

`novu envoy` is an AI-assisted CLI wizard that integrates Novu (Inbox + workflows + triggers) into an existing application using the Claude Agent SDK and the Novu MCP server.

> Status: **private beta** for enterprise customers. Requires the `IS_LLM_GATEWAY_ENABLED` LaunchDarkly flag and an enterprise tier subscription.

## Architecture

```
Developer terminal
        │
   novu envoy CLI ───────────────► Dashboard /cli/auth
        │                                │
        │  (loopback HTTP callback ◄─────┘
        ▼
   Claude Agent SDK loop
        │   ANTHROPIC_BASE_URL = <api>/v1/llm
        │   Authorization: ApiKey <secret>
        ▼
   apps/api + @novu/ee-ai → Anthropic API
        │
        ▼
   Novu MCP (https://mcp.novu.co) for workflow CRUD
```

The CLI never persists the secret key obtained via the browser flow — it lives only in process memory for the session. Subsequent runs always re-authorise.

## Files

- `index.ts` — orchestrator (banner, auth, project detect, intent prompt, agent loop, summary).
- `auth/device-auth.ts` — loopback HTTP server + browser open + state-validated callback.
- `auth/resolve-auth.ts` — picks `--secret-key`, `NOVU_SECRET_KEY`, or browser auth in that order.
- `context/detect-project.ts` — framework / package manager / TS / installed Novu deps detection.
- `context/gather-intent.ts` — `prompts`-based intent gathering, with `--yes` defaults.
- `agent/system-prompt.ts` — composed prompt for the Claude Agent SDK.
- `agent/run.ts` — drives `query()` from `@anthropic-ai/claude-agent-sdk`, wires the Novu MCP server, streams output.
- `skills/install-skills.ts` + `skills/content/*` — at runtime, the official Novu skill set is fetched from [`novuhq/skills`](https://github.com/novuhq/skills) via `git clone --depth=1` (cached per-branch for 24h under `~/.cache/novu-envoy/skills/<branch>/`) and copied into `<cwd>/.claude/skills/novu/` and `<cwd>/.cursor/skills/novu/`. Three envoy-specific gap-filler skills (`dashboard-workflow`, `env-setup`, `framework-workflow`) are bundled in `skills/content/` and overlaid into the same `novu/` directory. If the clone fails (offline, no `git`, network block), only the gap-fillers are installed and the CLI prints why.
  - Override the branch/tag/commit with `--skills-branch <ref>` (default: `main`) — useful for pinning a specific skills release or testing an unreleased branch.
- `analytics/events.ts` — analytics event helpers wired to the existing `AnalyticService`.

## Manual end-to-end verification

> Pre-requisite: API and dashboard running locally with `NOVU_ENTERPRISE=true`, the `IS_LLM_GATEWAY_ENABLED` LaunchDarkly flag enabled for the test organization, and `NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY` set on the API process.

1. Boot the API and dashboard:
   ```bash
   pnpm --filter @novu/api start:dev
   pnpm --filter @novu/dashboard dev
   ```
2. Scaffold a fresh Next.js app to integrate against:
   ```bash
   pnpm dlx create-next-app@latest envoy-target --ts --eslint --app --no-tailwind --no-src-dir --import-alias "@/*"
   cd envoy-target
   ```
3. Run envoy pointed at the local stack:
   ```bash
   pnpm --filter novu start:mode envoy --api-url http://127.0.0.1:3000 --dashboard-url http://localhost:4200
   ```
4. The browser opens `http://localhost:4200/cli/auth?cli_callback=http://127.0.0.1:<port>/callback&state=...&name=novu-envoy`. Sign in if needed, then click **Authorize**.
5. Pick "In-app inbox + email" when prompted; choose code-first workflows.
6. Approve each `Edit` / `Write` from the agent. Expected outcome:
   - `@novu/api`, `@novu/framework`, `@novu/nextjs`, `@novu/js` installed.
   - `app/api/novu/route.ts` created with a sample workflow and bridge.
   - A `<NovuInbox />` component added and mounted in the layout.
   - Trigger snippet placed in the relevant action / route handler.
7. Start the sample app (`pnpm dev`), verify the inbox bell renders, then trigger the workflow (`pnpm novu sync` once, then exercise the action) and confirm a notification appears.

## Failure modes the agent should surface gracefully

- HTTP 403 from `/v1/llm/messages` → "Novu Envoy is currently in private beta for enterprise customers — reach out to your Novu CSM."
- HTTP 404 from `/v1/llm/messages` → "Novu Envoy is not available on this Novu deployment."
- 5-minute browser auth timeout → "Authorization timed out. Please try again."
