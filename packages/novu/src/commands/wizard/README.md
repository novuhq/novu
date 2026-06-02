# Novu Wizard

`novu wizard` is an **autonomous** AI-assisted CLI wizard that integrates Novu (Inbox + workflows + triggers + subscribers) into an existing application using the Claude Agent SDK and the Novu MCP server.

> Status: **private beta** for enterprise customers. Requires the `IS_LLM_GATEWAY_ENABLED` LaunchDarkly flag and an enterprise tier subscription.

## Architecture

```mermaid
flowchart LR
  CLI[novu wizard] --> Driver[pipeline/runner.ts]
  Driver --> UI{WizardUI bridge}
  UI -->|TUI| InkUI[ui/ink-ui.ts → store → Ink]
  UI -->|CI/non-TTY| LoggingUI[ui/logging-ui.ts → stdout]
  Driver --> Bootstrap[1. Detect project + bootstrap]
  Bootstrap --> ParallelBlock{2. Pre-agent parallel block}
  ParallelBlock --> AuthStep[auth.ts]
  ParallelBlock --> SkillsStep[install-skills.ts]
  ParallelBlock --> InstallStep[install-packages.ts<br/>(outside SDK sandbox)]
  ParallelBlock --> McpStep[install-mcp.ts<br/>fan-out across hosts]
  ParallelBlock --> Agent[3. agent/iterator.ts]
  Agent -->|main agent| Survey[Survey project]
  Survey --> Fanout[Dispatch 3 parallel Task subagents]
  Fanout --> A[A. Inbox client UI]
  Fanout --> B[B. Workflows + Triggers]
  Fanout --> C[C. Subscribers auth hooks]
  Agent -->|TodoWrite tap| Store[ui/store.ts]
  Agent <-->|fix loop| Validate[validate.ts<br/>lint + typecheck]
  Agent --> Report[4. report/build-report.ts]
```

The CLI is observational: the imperative `pipeline/runner.ts` drives every step against the `WizardUI` bridge. The Ink screens never own business logic — they only `useStore` from the nanostores atom and render. The agent runs **end-to-end without prompting the user**; its progress is exposed through the agent's own `TodoWrite` calls (right pane) plus a fixed pipeline checklist (left pane).

### Why the wizard pre-installs packages

Package installs live in their own pipeline step (`pipeline/steps/install-packages.ts`) that runs in the wizard CLI's parent process **before** the Claude Agent SDK turn starts. Three reasons:

1. **macOS sandbox blocks `clonefile()`.** The SDK's filesystem sandbox blocks pnpm's reflink syscall on macOS, which made `pnpm add` always fail inside an agent turn. The agent then wasted 10+ minutes retrying `npm install` / `pnpm install` / `pnpm config set store-dir …` before resorting to a manual `package.json` edit.
2. **Topology-aware installs need monorepo context.** A single `pnpm add @novu/react` issued at the cwd is wrong in 90 % of monorepos: the install needs to be filtered to the right workspace (`pnpm --filter @app/web add @novu/react`), and the package list needs to differ per workspace (the API workspace doesn't need the Inbox SDK). The CLI walks `pnpm-workspace.yaml` / `workspaces`, classifies each workspace as `web` / `api` / `fullstack` / `library` (`context/classify-workspace.ts`), then issues **one batched install command per workspace** with the right packages for that role.
3. **Goal rebalancing.** `--goal=full` against a web-only repo is structurally meaningless (no API workspace to wire `novu.trigger` into). `context/rebalance-goal.ts` maps `(requestedGoal, topology)` to an `effectiveGoal`, downgrading silently when the request is achievable in a narrower form (`full` × web-only → `inbox`) and blocking when it is incompatible (`workflows` × web-only). The user-facing reason is surfaced in the live tail and the report.

The agent's `Bash(npm install:*)` / `Bash(pnpm add:*)` etc. prefixes are now in `WIZARD_DISALLOWED_TOOLS` so the agent cannot retry installs inside the sandbox even by accident; STEP 3 of `build-user-prompt.ts` tells the agent that packages are already on disk.

### Pre-agent parallel block

After bootstrap, the runner fans out **four** steps in parallel before the agent turn starts: `auth`, `skills`, `install-packages`, and `install-mcp`. The right pane stays on `AuthPane` for the whole block — that's where the only user-blocking interaction lives — while the pipeline pane on the left ticks each row off as its promise resolves. MCP chains on auth (it needs the resolved API key + region); everything else fires immediately.

`Promise.all` rejects on the first failure, so any rejection (auth abort, install rebalance-block) drops the runner into its catch branch and skips agent / validate / report. MCP install is wrapped in fail-soft try/catch internally so it never rejects on its own.

**Host detection is unified.** The same agent / editor host list (`claude`, `cursor`, `windsurf`, `copilot`, `agents`, `gemini`, `roo`, `opencode`, `kiro`) is resolved **once** by `resolveWizardRuntimeSkillHosts(process.cwd())` at the top of the parallel block and passed to both the skills installer **and** the MCP installer. Without this the two steps would re-detect independently and could disagree (e.g. if the agent later writes a new editor's config dir mid-run). The MCP installer also intersects host → adapter against `installer.detect()` so it never writes a config into an editor that isn't actually present on disk.

The skills installer writes `SKILL.md` folders into every detected host's skills dir (`.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, …). The MCP installer fans out across the subset of hosts that have first-party MCP clients (`claude → claude-code`, `cursor → cursor`, `windsurf → windsurf`, `copilot → vscode`) and writes one Novu MCP server config per editor.

### Parallel agent fan-out

The agent phase is the dominant pole of wall-clock time. To cut it, the **main agent** acts as an orchestrator: it surveys the already-installed packages on disk (the package install ran in the parent process before the agent started — see [Why the wizard pre-installs packages](#why-the-wizard-pre-installs-packages)) and dispatches **three parallel `Task` subagents** in a single assistant message so they run concurrently:

- **A. Inbox** — owns client UI files (layout / page / header / nav / sidebar). Mounts `<Inbox />` and the Provider wrapper. Picks the Inbox SDK based on the workspace's framework (`@novu/react-native` for Expo / RN, `@novu/nextjs` for Next.js, `@novu/react` for any other React-based framework, `@novu/js` for non-React frameworks like Vue / Svelte / SvelteKit / Nuxt).
- **B. Workflows + Triggers** — owns server-side handlers excluding auth hooks. Reasons about the product domain, discovers its own trigger sites, creates workflows (code-first via `@novu/framework` if present; otherwise no-code via the Novu MCP server), and wires `novu.trigger(...)` calls. Workflows must precede triggers, so this branch is sequential within itself and is the critical pole.
- **C. Subscribers** — owns auth-provider hook files only (Clerk / Better Auth / NextAuth / Supabase). Skipped when no auth provider is detected.

Each subagent ends its final assistant message with a structured JSON block (see `types.ts › BranchResult`). The CLI parses those blocks **directly off the message stream** in `pipeline/steps/run-agent.ts` (keyed by `parent_tool_use_id` → outer `Task` `tool_use_id`), so the main agent does **not** need to re-read every subagent's payload back into context to forward it as an aggregate. `report/build-report.ts` builds `novu-wizard-report.md` deterministically from the tool-call trail + those streamed JSON blocks.

The full subagent system prompts are pre-rendered to `.claude/agents/novu-wizard-{inbox,workflows,subscribers}.md` at run start by `agent/install-agents.ts`. The SDK's `Task` tool picks them up automatically when the main agent dispatches with the matching `subagent_type`, so the main-agent `prompt` parameter only carries per-run dynamic context (3-6 lines) instead of regenerating the entire branch prompt as model tokens. The agent files are removed in `runAgentStep`'s `finally` block so the user's `.claude/agents/` directory isn't littered between runs.

Domain ownership is *guidance* (each subagent's prompt tells it which files it owns). The Stop hook (`agent/stop-hook.ts`) blocks turn-end until every dispatched branch has returned its `tool_result`; the SDK serialises concurrent `Write` / `Edit` calls at its tool-execution layer if two branches legitimately converge on the same file.

The CLI never persists the secret key obtained via the browser flow — it lives only in process memory for the session. Subsequent runs always re-authorise.

## Files

### Driver layer
- `pipeline/runner.ts` — orchestrator: bootstrap → **(auth ∥ skills ∥ install ∥ mcp)** → agent ↔ validate (in-session fix loop) → report → outro. The four pre-agent steps fan out in parallel; the agent only starts once every promise resolves. See [Pre-agent parallel block](#pre-agent-parallel-block).
- `pipeline/steps/*.ts` — one file per pipeline phase. `install-packages.ts` and `install-mcp.ts` run OUTSIDE the SDK sandbox (they touch lockfiles / editor config dirs the sandbox would block). `validate.ts` is invoked by `run-agent.ts` between agent turns to lint + typecheck the touched workspaces and feed failures back into the same SDK session as a follow-up user message until the code is clean or the budget is exhausted.

### Agent
- `agent/system-prompt.ts` — autonomous system prompt (TodoWrite-first, parallel-fan-out).
- `agent/build-user-prompt.ts` — main-agent user prompt: survey on-disk state → dispatch three parallel `Task` subagents → end (package install + MCP install + skills install all happened in the parent process before this prompt; the CLI builds the report).
- `agent/build-subagent-prompt.ts` — per-branch subagent prompts (Inbox / Workflows+Triggers / Subscribers). Each subagent returns its result as a fenced JSON block.
- `agent/install-agents.ts` — at run start, renders the three subagent prompts via `buildSubagentPrompt` and writes them to `.claude/agents/novu-wizard-{inbox,workflows,subscribers}.md` so the SDK's `Task` tool injects them as preset system prompts. Cleans the files up in the runner's `finally` block.
- `agent/iterator.ts` — wraps `query()` from `@anthropic-ai/claude-agent-sdk`, configures the Novu MCP server, registers the `Stop` hook, exposes the SDK iterator + interrupt/close.
- `agent/stop-hook.ts` — per-branch dispatch / completion gates that block turn-end until every dispatched subagent has returned.
- `agent/can-use-tool.ts` — permission gate consulted by the SDK before every tool call (env-file blacklist, dangerous-Bash filter). Pure function, no per-branch logic.
- `agent/commandments.ts` — negative guardrails included in the system prompt.
- `agent/tool-labels.ts` — short labels for tool calls (used by live tail and chat overlay).

### Auth & detection
- `auth/device-auth.ts` — loopback HTTP server + browser open + state-validated callback.
- `auth/resolve-auth.ts` — picks `--secret-key`, `NOVU_SECRET_KEY`, or browser auth in that order.
- `context/detect-project.ts` — framework / package manager / TS / installed Novu deps detection. Also exports the pure `detectFrameworkFromDeps(cwd, deps)` helper used by the workspace classifier.
- `context/classify-workspace.ts` — pure classifier that turns one workspace's `package.json` (deps + scripts + filesystem hints) into a `WorkspaceRole` (`web` / `api` / `fullstack` / `library`) plus a human-readable reason.
- `context/detect-install-targets.ts` — walks `pnpm-workspace.yaml` / `workspaces` glob entries, classifies each workspace, and returns the application targets the install step will operate on. Falls back to a single-target topology for non-monorepo repos.
- `context/rebalance-goal.ts` — maps `(requestedGoal, topology)` to either `{ kind: 'ok', effectiveGoal, reason }` or `{ kind: 'block', reason }`. Drives the silent goal downgrade for unambiguous cases and the abort for incompatible ones.

### Package installer (parent-process)
- `utils/package-managers.ts` — declarative descriptors for pnpm / yarn-v1 / yarn-v2 / bun / npm: install verb, static flags (`--ignore-workspace-root-check` for pnpm + yarn v1), `forceInstallFlag`, `workspaceFilter(name)`, lockfile-driven `detect()`. Plus `renderInstallCommand({ descriptor, packages, workspaceName, legacyPeerDeps, force })` which emits **one** install command containing the full package list for a workspace (yarn gets the special `yarn workspace <name> add …` shape because its filter sits before the verb).
- `pipeline/steps/install-packages.ts` — orchestrator. For each application target it picks packages from the per-role matrix:
  - **web**: Inbox SDK only — `@novu/react-native` (Expo / RN) → `@novu/nextjs` (Next.js) → `@novu/react` (other React-based: Remix, RedwoodJS, Blitz, Astro+React, React+Vite, plain React) → `@novu/js` (non-React: Vue, Svelte, SvelteKit, Nuxt, Solid, Angular, …; the headless / framework-agnostic Inbox SDK).
  - **api**: `@novu/api` (always — `novu.trigger` mounts) + `@react-email/components` (only when `@novu/framework` is already present).
  - **fullstack**: Inbox SDK (same picker as `web`) + `@novu/api` (+ `@react-email/components` if `@novu/framework` is present).
  - **library**: skipped.
  Spawns the package manager via `cross-spawn` (sequentially across targets so two concurrent runs never write the same lockfile). Applies `--legacy-peer-deps` for `npm` + React 19. On non-zero exit, writes `novu-wizard-install-error-<workspace>-<timestamp>.log` next to the workspace's `package.json`, splices the packages into `package.json` directly so the agent run can still emit imports, and continues to the next target.

### Skills
- `skills/install-skills.ts` + `skills/content/env-setup/` — at runtime, the official Novu skill set is fetched from [`novuhq/skills`](https://github.com/novuhq/skills) via `git clone --depth=1` (cached per-branch for 24h under `~/.cache/novu-wizard/skills/<branch>/`) and each skill folder under `<cache>/skills/` is copied into `<cwd>/.claude/skills/<name>/` (and into every other detected editor's skills dir). The `env-setup` gap-filler is bundled in `skills/content/`. Override the branch with `--skills-branch <ref>` (default: `main`).
- `skills/check-claude-settings.ts` — warns about `.claude/settings.json` keys that would override the wizard's LLM gateway auth.

### MCP installer
- `mcp/installer.ts` — detection + install entry point. Returns the list of known editors with their `detected` flag; writes the Novu MCP server config into a single client by id when invoked.
- `mcp/clients/index.ts` — per-editor adapter registry plus `mapSkillHostToMcpClientId` / `mapSkillHostsToMcpClientIds`, the helpers that translate the unified agent-host list (`claude`, `cursor`, `windsurf`, `copilot`, …) into MCP adapter ids. Hosts without a first-party MCP client (`agents`, `gemini`, `roo`, `opencode`, `kiro`) are skipped.
- `mcp/clients/*.ts` — per-editor adapters: `cursor`, `claude-code`, `vscode`, `windsurf`, `codex`, `cline` (one file each).
- `mcp/server-config.ts` — shared `mcp-remote <url> --header Authorization:Bearer <secret>` shape.
- `pipeline/steps/install-mcp.ts` — runtime fan-out. In `autoSelect` mode (the runner's default) it maps the resolved hosts → adapter ids, intersects with `installer.detect()`, and installs the Novu MCP server config into **every** detected host's MCP client (Cursor + Claude Code + VS Code + Windsurf, etc.) — one editor at a time so JSON / TOML writes never interleave. The legacy interactive picker path (`autoSelect: false`) installs into a single user-chosen client; both paths append their results to `session.mcp.installed` (now a `McpInstallResult[]`), and the report renders one bullet per editor.

### Report
- `report/build-report.ts` — **canonical** writer. Builds `novu-wizard-report.md` deterministically from the tool-call trail (every `Write` / `Edit` / `mcp__novu__*` call streamed in by `pipeline/steps/run-agent.ts`) plus the per-branch JSON aggregate that the main agent emitted in its final message. The agent never writes the report file itself — this is a TS step. Sections: Goal, Project context, **Packages installed** (per-target matrix incl. installs / `package.json` edits / library skips, with the goal rebalance reason when the user-requested goal didn't fit), Files changed, Workflows created, Trigger sites wired, Subscriber sync points, Manual triggers needed, **Validation** (lint + typecheck pass/fail per workspace, with fix-loop attempt count and "budget exhausted" header when the loop bailed early), **Wizard ops** (skills installed, plus one bullet per editor that received the Novu MCP server — flat for a single editor, nested list when multiple hosts were resolved), Notes, Next steps. Next steps include a per-workspace `pnpm install` reminder when the install step had to fall back to direct `package.json` edits.

### UI
- `ui/store.ts` — nanostores `WizardStore` (phases, todos, trail, liveTail, overlay, gates).
- `ui/wizard-ui.ts` + `ui/ink-ui.ts` + `ui/logging-ui.ts` — `WizardUI` bridge interface and its two implementations.
- `ui/router.ts` + `ui/flows.ts` + `ui/screen-registry.tsx` — declarative pipeline of screens, resolved from the session snapshot.
- `ui/primitives/*` — vendored layout primitives (`ScreenContainer`, `SplitView`, `ProgressList`, `LoadingBox`, `PickerMenu`, etc.).
- `ui/screens/*` — `run-screen` (top header + 3-pane: pipeline ⨯ phase pane + live tail + footer; hosts the bootstrap countdown via `use-bootstrap-countdown` and swaps its right pane through bootstrap → auth → agent → outro as `session.runPhase` advances; the MCP pane (`mcp-pane.tsx`) renders during `RunPhase.Mcp` as a status surface listing every editor that received the Novu MCP config, and only acts as an interactive picker for the legacy `autoSelect: false` path). The driver awaits the `outro` gate before tearing the UI down so the outro pane stays visible until the user dismisses it.
- `ui/overlays/chat-overlay.tsx` — full-screen, read-only trail opened via `/chat`.
- `ui/components/{help,errors}-overlay.tsx` — kept overlays, rewired to read from the store.
- `ui/components/command-footer.tsx` + `ui/hooks/use-slash-input.ts` — small inline slash buffer (`/activity /help /errors`).
- `ui/index.tsx` — Ink mount + dark-mode background ANSI on startup, restored on exit.

### Analytics
- `analytics/events.ts` — per-screen events (`Wizard Screen Bootstrap`, `Wizard Screen Run`, `Wizard Screen Mcp`, `Wizard Screen Outro`, `Wizard Mcp Installed`, `Wizard Report Written`).

## CLI flags

- `--goal {full|inbox|workflows}` — default `full` (Inbox + workflows + triggers + subscribers).
- `--yes` — resolve the bootstrap gate immediately. (The MCP installer no longer surfaces a picker by default — it auto-fans-out across every detected host — so this flag is now mostly about skipping the bootstrap countdown.)
- `--ci` — force the non-interactive logging UI: no Bootstrap countdown, no interactive picker, plain stdout.
- `--debug` — surface per-phase + per-todo durations in the UI and print a timing summary on exit (`[debug] timing summary` block, e.g. `total: 2m17s`, `phases: …`, `agent todos: …`). The always-on `MM:SS` clock pinned to the wizard header is independent of this flag — `--debug` only adds the granular breakdown.
- `--secret-key`, `--api-url`, `--dashboard-url`, `--mcp-url`, `--region`, `--model`, `--skills-branch` — unchanged.

## Manual end-to-end verification

> Pre-requisite: API and dashboard running locally with `NOVU_ENTERPRISE=true`, the `IS_LLM_GATEWAY_ENABLED` LaunchDarkly flag enabled for the test organization, and `NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY` set on the API process.

1. Boot the API and dashboard:
   ```bash
   pnpm --filter @novu/api start:dev
   pnpm --filter @novu/dashboard dev
   ```
2. Scaffold a fresh Next.js app to integrate against:
   ```bash
   pnpm dlx create-next-app@latest wizard-target --ts --eslint --app --no-tailwind --no-src-dir --import-alias "@/*"
   cd wizard-target
   ```
3. Run wizard pointed at the local stack:
   ```bash
   pnpm --filter novu start:mode wizard --api-url http://127.0.0.1:3000 --dashboard-url http://localhost:4200
   ```
4. The browser opens `http://localhost:4200/cli/auth?cli_callback=http://127.0.0.1:<port>/callback&state=...&name=novu-wizard`. Sign in if needed, then click **Authorize**.
5. Watch the wizard run end-to-end. While auth is resolving, the runner installs the Novu skill files, runs `pnpm add` against each detected workspace, and writes a Novu MCP server config into every detected editor (Cursor + Claude Code + VS Code + …) — all in parallel. The agent then scaffolds the Inbox, creates workflows, wires trigger sites, runs the validate ↔ fix loop, and finally `novu-wizard-report.md` is written to the project root.
6. Open one of the editors that received an MCP config (Cursor / Claude Code / VS Code / Windsurf) and confirm the `novu` server shows up in its MCP UI — workflows the agent created should be queryable through it.
7. Start the sample app (`pnpm dev`), verify the inbox bell renders, then trigger the workflow and confirm a notification appears.

## Failure modes the agent should surface gracefully

- HTTP 403 from `/v1/llm/messages` → "Novu Wizard is currently in private beta for enterprise customers — reach out to your Novu CSM."
- HTTP 404 from `/v1/llm/messages` → "Novu Wizard is not available on this Novu deployment."
- 5-minute browser auth timeout → "Authorization timed out. Please try again."
- Render-time crash inside any screen → caught by `ScreenErrorBoundary`, the wizard transitions to the Outro screen with `OutroKind.Error`.
