# Dry Run Report: Connect Agent to Customers via Novu

**Task (as given):** Connect my agent to customers with Novu using instructions from https://novu.co/agents.md

**Dry-run constraint:** No real Novu API calls, no `npx novu connect`, no OAuth, no channel tokens, no dashboard mutations.

**Sandbox:** `/workspace/dry-run-agent-sandbox` — fictional “HelpDesk Lite” customer support product.

**Report date:** 2026-08-15

---

## 1. How I interpreted the request

| Phrase | Interpretation |
|--------|----------------|
| “my agent” | User wants an AI agent that represents their product to **customers** (end users), not an internal dev assistant. |
| “connect … to customers” | Primary goal is **channel reach** — customers can message the agent on Slack, email, WhatsApp, etc. |
| “using instructions from novu.co/agents.md” | Follow the **hosted onboarding playbook** (path selection, auth, `connect --ci`, handoffs, reporting). |

**Not present in the prompt (important for routing):**

- No “add an agent to **my app**” / “wire” / “AI SDK” / “LangChain” → **no mandatory bridge path**.
- No “I'm signed in to the Novu dashboard” → **default keyless** on managed path (per agents.md auth rules).
- No explicit channel → **must ask** (Step M1) before running connect.
- No explicit approval of agent description → **must infer + confirm** (Step M2) before connect.

---

## 2. References consulted

### Primary (mandatory)

| Reference | How used |
|-----------|----------|
| https://novu.co/agents.md | **Primary SOP** — fetched in full (~730 lines). Defined path routing, auth, steps M1–M5 / B1–B6, handoffs, flags, definition of done. |
| `/workspace/dry-run-agent-sandbox/README.md` | Simulated project context for Step M2 (audience + integrations). |
| `/workspace/dry-run-agent-sandbox/package.json` | Simulated `name` / `description` for agent purpose inference. |

### Repo-local (cross-check against implementation)

| Reference | How used |
|-----------|----------|
| `apps/dashboard/src/components/onboarding/connect-agent/prebuilt-prompt-banner.tsx` | Confirms dashboard onboarding prompt shape: dashboard OAuth + agents.md URL. |
| `packages/novu/src/commands/connect/index.ts` | Verified `--ci` uses logging UI + `runConnectPipeline` (non-interactive path exists). |
| `packages/novu/src/commands/connect/api/agents.ts` | Managed vs bridge agent creation (`runtime: 'managed' \| 'self-hosted'`), `generateAgent` prompt expansion. |
| `docs/agents/get-started/claude-managed.mdx` | Supplemental managed-agent narrative (interactive CLI; less relevant for `--ci` dry run). |
| `/workspace/README.md` | Novu positioning: ACI connects agents to channels via unified conversation model. |
| `/workspace/AGENTS.md` | Cloud env: pre-seeded dashboard user (relevant if we *were* to test dashboard OAuth locally). |

### Would consult during real execution (not opened in dry run)

| Reference | When |
|-----------|------|
| https://docs.novu.co/llms.txt | Bridge path stuck on wiring (agents.md Step B5). |
| `novu@latest connect --help` | Flag contract before final command assembly. |
| Channel-specific docs under `docs/agents/channels/` | User picks non-default channel. |

---

## 3. Step 0 — Path selection

### Decision: **Managed agent path** (default)

**Reasoning (agents.md routing table):**

```
"Add an agent to my app"           → bridge (MANDATORY)
"Connect … <channel> for project"  → managed (MANDATORY)
User prompt                        → "Connect my agent to customers"
```

The user describes **customer reach**, not **handler wiring in their codebase**. No AI SDK / LangChain signals. “My agent” here reads as “the agent for my product” rather than “my self-hosted handler.”

### Alternatives considered

| Path | Why rejected (for this prompt) |
|------|--------------------------------|
| **Custom code bridge** | Would apply if user said “add to my app”, named AI SDK/LangChain, or wanted replies from **their server code**. None of that appears. |
| **Managed + skip channel** | Possible if user only wanted agent record first; prompt says “to customers” → channel connection is implied. |

**Ambiguity note:** If the user already runs a **self-hosted** agent elsewhere and only wants Novu as a channel router, bridge path could be correct — would ask Step 0 only if they also mention “my codebase” / “my API route” / framework names.

---

## 4. Auth mode

### Decision: **Keyless** (`--keyless`)

**Rules applied (agents.md § Auth mode):**

- Default: pass `--keyless` for anonymous / no dashboard signal.
- Omit `--keyless` only when user says they’re signed into dashboard, have an account, etc.

**Dry-run note:** In this Cursor Cloud workspace, `AGENTS.md` says the dashboard auto-signs in as `agent@novu.co`. That is **environment context for the agent executing the task**, not something the **user’s prompt** stated. Per agents.md, I would still default to keyless unless the user’s prompt includes the dashboard sentence.

**If user later says “I'm signed in to the Novu dashboard”:** switch to dashboard OAuth (omit `--keyless`); agent lands in Development environment of their org.

**Bridge path rule (not applicable here):** bridge always omits `--keyless`.

---

## 5. Simulated Step M1 — Channel choice

**Action in real run:** `AskQuestion` with exactly 4 options (agents.md hard limit):

| Option id | Label (grouped) |
|-----------|-----------------|
| `slack` | Slack |
| `email` | Email |
| `telegram` | Telegram / iMessage (Sendblue) |
| `dashboard` | WhatsApp / MS Teams |

Plus prompt text: user can say “skip” in free text for agent-only setup.

**Dry-run simulation:** Assume user picks **`email`** — lowest friction for a “customers” narrative (no Slack workspace / BotFather / Meta signup), and email handoff is fully CLI-pollable in keyless mode.

**Channel implications for keyless + email:**

- No MS Teams hard-stop (teams + keyless → dashboard redirect only).
- No Sendblue credential collection up front.
- No Slack/Telegram token delivery picker until Step 4 (not needed for email).

---

## 6. Simulated Step M2 — Agent purpose inference

### Project read (sandbox)

From `dry-run-agent-sandbox`:

- **Product:** HelpDesk Lite — customer support portal.
- **Audience:** shoppers / account holders (**customers**).
- **End-user-facing integration:** Intercom (live chat customers already use).

### Lists built (agents.md methodology)

**1. What the agent does (customer tasks):**

- Answer billing and order-status questions.
- Help customers open and track support tickets.
- Escalate complex issues appropriately.

**2. What end users actually use:**

- Intercom (named — customers chat there today).

**Excluded (persona / infra guardrails):**

- PostgreSQL, Resend, MongoDB — backend; end users don’t “use” these.
- GitHub, Sentry, Linear — dev tooling; wrong audience.

### Draft description (would show to user)

> A support assistant for HelpDesk Lite's customers that answers billing questions, checks order and ticket status, and helps resolve delivery issues, and can escalate live chats via Intercom.

### Self-check (agents.md)

1. Audience named (customers) — pass.
2. No internal infra named — pass.
3. Intercom named only as end-user-facing tool — pass.

### Simulated user approval

Assume user picks **`approve`** (“Looks good — run connect”).

---

## 7. Simulated Step M3 — Connect command (NOT EXECUTED)

**Would run** (background shell, `block_until_ms: 0`, then Await shell id):

```bash
export NOVU_AGENT_DESCRIPTION='A support assistant for HelpDesk Lite'\''s customers that answers billing questions, checks order and ticket status, and helps resolve delivery issues, and can escalate live chats via Intercom.'

npx novu@latest connect "$NOVU_AGENT_DESCRIPTION" \
  --ci \
  --keyless \
  --channel email
```

**Why these flags:**

| Flag | Reason |
|------|--------|
| Positional description | Required for managed `--ci` runs. |
| `--ci` | Non-interactive; agents.md requires it for AI-agent-driven flow. |
| `--keyless` | No dashboard signal in user prompt. |
| `--channel email` | Simulated M1 choice. |
| No `--runtime` / `--anthropic-api-key` | Managed path uses demo runtime. |
| No `--region eu` | User did not request EU. |

**Explicitly NOT run in dry run** — would create a real keyless agent and start email handoff polling.

---

## 8. Simulated Step 4 — Channel handoffs (email)

**Would Await on connect shell stdout:**

```text
NOVU_CONNECT_INBOUND_ADDRESS=<address>
NOVU_CONNECT_MAILTO=<mailto-url>
NOVU_CONNECT_SEND_FROM_EMAIL=<email>   # if present
```

**Would deliver to user:**

1. Clickable `NOVU_CONNECT_MAILTO` link (primary).
2. Inbound address as copy-paste fallback.
3. Send-from constraint if `NOVU_CONNECT_SEND_FROM_EMAIL` present.

**Would NOT:** call Novu APIs manually to verify email arrival — CLI poll owns validation.

---

## 9. Simulated Step M5 — Report template

On success, would lead with literal CLI line, then recap, then next step:

```text
✓ Your agent is live.
  Agent: <name> (<identifier>)
  → Check Email — your agent just messaged you.
  Claim your agent: <claim url>
```

**Recap (example prose):**

> Here's what Novu built from your description: a hosted demo AI agent with a system prompt, tools/skills, MCP hooks for Intercom, and an email channel so customers can reach it. Demo mode allows ~5 free replies until you claim the agent.

**Next step (keyless):** surface **Claim your agent** link — signing up migrates agent + channel + conversation into their workspace.

---

## 10. Operating principles — how they shaped the dry run

| Principle | Application |
|-----------|-------------|
| One run, one outcome | Single connect command only; no speculative second agent. |
| Confirm before act | Documented M2 approval gate before hypothetical M3. |
| Secure setup pages first | For Slack/Telegram; N/A for simulated email path. |
| Background connect shell only | Documented; would not run foreground (timeout risk). |
| No log file watchers | Progress only via Await on shell id — no `tail`/`grep` on logs. |
| Read tool for package.json | Used Read on sandbox `package.json`; would not `grep`/`cat`. |
| Option picker for fixed choices | M1 channel, M2 approve/edit, Step 4 token delivery. |

---

## 11. What a bridge-path dry run would look like (counterfactual)

If user prompt were: *“I'm signed in to the Novu dashboard. Add an agent to my app following https://novu.co/agents.md”* (dashboard prebuilt prompt):

| Step | Difference |
|------|------------|
| Path | Custom code bridge |
| Auth | Dashboard OAuth — **no `--keyless`** |
| M2 | **Skipped** — no managed description |
| B2 | Read `package.json` deps → `ai-sdk` vs `langchain` |
| B3 | `npx novu@latest connect --ci --runtime ai-sdk --channel slack` (no positional prompt) |
| B5 | Read `NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE=`, Write bridge route + handler |
| Done | User runs `dev:novu` |

This is the path encoded in `prebuilt-prompt-banner.tsx` for dashboard onboarding.

---

## 12. Definition of done — dry run vs real run

### Dry run (this document)

- [x] Fetched and followed agents.md structure.
- [x] Created minimal sandbox project for inference exercise.
- [x] Documented path, auth, channel, description, command, handoffs, report.
- [x] Listed all references and reasoning.
- [x] Did **not** integrate anything real.

### Real run (not performed)

- [ ] User picks channel (M1).
- [ ] User approves description (M2).
- [ ] Connect shell exits 0 with `✓ Your agent is live.`
- [ ] Handoff completed (email sent / Slack OAuth / etc.).
- [ ] User receives claim link or dashboard URL.

---

## 13. Clarifications that would help a real execution

None required to **start** — agents.md says to default managed + keyless and ask channel via picker.

Optional clarifications that would **change** the plan:

1. **“I'm signed in to the Novu dashboard”** → dashboard OAuth, Development env.
2. **“Add/wire to my app” + AI SDK/LangChain** → bridge path, wiring steps.
3. **Specific channel** upfront → skip M1 picker.
4. **EU region** → add `--region eu`.
5. **Existing self-hosted agent** → confirm bridge vs managed hosted demo.

---

## 14. Sandbox contents

```
dry-run-agent-sandbox/
├── README.md      # Fictional product + customer audience
├── package.json   # name/description for inference
└── DRY_RUN_REPORT.md  # this file
```

No application code — intentional. Managed path does not require codebase wiring; sandbox only supports Step M2 inference.

---

## 15. Executive summary

For **“Connect my agent to customers with Novu”** without bridge signals, the agents.md playbook routes to a **managed, keyless, demo-runtime agent** with a **user-chosen customer channel**. I would infer a **customer-facing** description from the project (not a dev assistant), get explicit approval, run **one** backgrounded `npx novu@latest connect "$NOVU_AGENT_DESCRIPTION" --ci --keyless --channel <pick>`, hand off channel-specific URLs from `NOVU_CONNECT_*` sentinels, and close with the CLI success line plus a **claim link** (keyless) or dashboard URL (authenticated).

This dry run produced the decision trail and hypothetical command without creating agents, tokens, or channel connections.
