# Novu Agent Onboarding — instructions for an AI agent

You are an AI coding agent helping a user create their first **Novu managed agent** and connect it to a **channel of their choice**, with **no Novu account required up front** (keyless mode). You will gather a couple of inputs, infer the agent's purpose from the user's project, run one non‑interactive CLI command, hand the user whatever they need to finish connecting the channel, and then explain how they keep the agent by signing up.

Do not wire Novu into the user's codebase. This flow only creates a hosted agent and connects a channel.

---

## What you will do (overview)

1. Ask the user which **channel** they want, and collect channel‑specific inputs.
2. Infer the agent's purpose from the project and confirm it with the user.
3. Run `novu connect` non‑interactively (keyless).
4. Watch the output and hand the user the channel‑specific next step (authorize link, inbox address, or dashboard link).
5. Report success and explain the demo limit → sign‑up/claim.

---

## Prerequisites (one‑time)

This is the pre‑npm flow, so you invoke the CLI by its **full path** from the built output.

1. Build the CLI from the repo root:

```bash
pnpm --filter novu build
```

2. Resolve the absolute repo root (the directory that contains `packages/novu`) and set the entry path you will use for every command below:

```bash
NOVU_REPO=~/projects/novu
NOVU_CLI="$NOVU_REPO/packages/novu/dist/src/index.js"
```

> Assume the Novu API/stack is already running and configured for keyless. This guide targets the local stack via `--region local`. When the CLI ships to npm, every `node "$NOVU_CLI" connect …` below becomes simply `npx novu connect …`.

---

## Step 1 — Ask the user which channel, and collect inputs

**Always ask the user to choose a channel** — do not assume one. Present these options and what each requires:

| Channel (`--channel`) | What the user must do | Works headlessly? |
|---|---|---|
| `slack` | Provide a **Slack App Configuration Token** (`xoxe.xoxp-…`), then click an OAuth link to approve the install. | Yes (with a click) |
| `email` | Nothing up front. The CLI prints an inbound email address; the user sends one email to it. | Yes (with one email) |
| `whatsapp` | Finish setup in the Novu dashboard — the CLI prints a dashboard link to open. | Partial (dashboard) |
| `teams` | Finish setup in the Novu dashboard — the CLI prints a dashboard link to open. | Partial (dashboard) |
| `telegram` | **Not supported through this agent flow** — Telegram setup is interactive (QR scans) and the non‑interactive CLI rejects it. Tell the user to either pick another channel, or run `node "$NOVU_CLI" connect "<description>" --region local --channel telegram` themselves (without `--ci`) and follow the prompts. | No |
| `skip` | Create the agent only, connect a channel later. | n/a |

Channel‑specific inputs to collect **after** they choose:

- **slack** → ask for the **Slack App Configuration Token** (`xoxe.xoxp-…`, required). The CLI uses it once to create the Slack app from a manifest; it is never stored. The user generates it at <https://api.slack.com/apps> under **"Your App Configuration Tokens"** (see <https://api.slack.com/authentication/config-tokens>); copy the **access token** (`xoxe.xoxp-…`), which is short‑lived (~12h).
- **email / whatsapp / teams / skip** → no extra input needed.

Also (any channel), optionally ask: **use your own Claude/Anthropic key?** If yes, capture `sk-ant-…` for BYOK (Step 3). Otherwise the default **demo runtime** is used (no key needed).

Do **not** ask them for the agent name/description — you will infer it next.

---

## Step 2 — Infer the agent's purpose from the project

Read the project to decide what this agent should *do* for the user:

- `README.md`, `package.json` (name/description/keywords), and the app's primary source (routes, domain models, product copy).

From that, draft a concise **1–2 sentence agent description** of the assistant the user likely wants — e.g. _"A support agent for <product> that answers questions about <domain> and can <key action>."_ This string becomes the agent prompt; the server expands it into a system prompt, tools and skills.

Show the drafted description to the user, let them edit it, and **get explicit confirmation** before running anything.

**MCP servers — only choose from the supported catalog below.** When the description implies third‑party integrations (e.g. Stripe, GitHub, Linear), only reference ones that exist in the [Supported MCP servers](#supported-mcp-servers) list, by their catalog **id**. Never invent MCP ids, names, or URLs. Keep the set minimal — pick only what the project clearly needs; if a needed integration isn't in the list, omit it (the user can add MCPs later in the dashboard). The generated agent's MCP servers are drawn from this catalog; if you review or adjust them, drop anything whose id is not in the list.

---

## Supported MCP servers

The agent may only use MCP servers from this catalog — match by **id**. These are the only valid ids; anything else will not connect.

**Popular (prefer these):** `slack`, `linear`, `atlassian-rovo`, `github`, `gitlab`, `sentry`, `notion`, `asana`, `amplitude`, `airtable`, `stripe`, `intercom`, `datadog`, `grafana`, `new-relic`, `pagerduty`

**Full catalog by category (ids):**

- **code:** `github`, `gitlab`, `sentry`, `datadog`, `grafana`, `new-relic`, `pagerduty`, `aws-marketplace`, `buildkite`, `cloudflare`, `axiom`, `better-stack`, `cloudflare-developer-platform`, `context7`, `google-compute-engine`, `harness-io`, `honeycomb`, `hugging-face`, `incident-io`, `jam`, `jentic`, `ketryx`, `launchdarkly`, `mintlify`, `netlify`, `planetscale`, `postman`, `pulumi`, `railway`, `replicate`, `semgrep`, `sourcegraph`, `stytch`, `vercel`
- **communication:** `slack`, `intercom`, `campfire`, `circleback`, `fathom`, `fellow-ai`, `fireflies`, `gmail`, `grain`, `guru`, `krisp`, `lorikeet`, `otter-ai`, `pylon`, `read-ai`, `send`, `superhuman-mail`, `tldv`, `unthread`, `zoho-desk`, `zoom-for-claude`
- **data:** `amplitude`, `airtable`, `mixpanel`, `neon`, `supabase`, `bigdata-com`, `cb-insights`, `cdata-connect-ai`, `consensus`, `contentsquare`, `coupler-io`, `enterpret`, `exa`, `google-cloud-bigquery`, `monte-carlo`, `motherduck`, `motion-creative-analytics`, `omni-analytics`, `orion-by-gravity`, `polar-analytics`, `posthog`, `scholar-gateway`, `scite`, `sprouts-data-intelligence`, `supermetrics-marketing-analytics`, `tavily`, `thoughtspot-spotter`, `windsor-ai`
- **design:** `canva`, `figma`, `adobe-for-creativity`, `biorender`, `cloudinary`, `descript`, `eraser`, `gamma`, `lucid`, `magic-patterns`, `miro`, `splice`, `three-js-3d-viewer`, `trimble-sketchup`, `webflow`, `wix`
- **financial-services:** `stripe`, `brex`, `plaid`, `square`, `aiera`, `airwallex-developer`, `carta`, `chronograph`, `coindesk`, `d-b-risk-analytics`, `daloopa`, `datasite`, `digits`, `factset-ai-ready-data`, `fiscal-ai`, `fmp`, `guidepoint`, `gusto`, `harmonic`, `ibisworld`, `ice-data-services`, `intuit-credit-karma`, `intuit-turbotax`, `lseg`, `lunarcrush`, `mercury`, `moodys`, `morningstar`, `msci`, `mt-newswires`, `paypal`, `pitchbook-premium`, `privacy-com`, `quartr`, `ramp`, `razorpay`, `rillet`, `s-p-global`, `third-bridge`, `tropic`, `verisk-underwriting-intelligence`, `xero`, `yardi-virtuoso`, `zocks`, `zoho-books`
- **health-and-wellness:** `adisinsight`, `medidata`, `owkin`, `synapse-org`, `synthesize-bio`
- **productivity:** `linear`, `atlassian-rovo`, `notion`, `asana`, `adobe-experience-manager`, `box`, `dropbox`, `google-drive`, `base44`, `calendly`, `clickup`, `craft`, `day-ai`, `devrev`, `docuseal`, `docusign`, `dovetail`, `egnyte`, `era-context`, `euler`, `google-calendar`, `granola`, `ifttt`, `imanage-work`, `ironclad-contracts`, `jotform`, `klarity`, `lumin`, `make`, `mem`, `microsoft-365`, `monday-com`, `netdocuments`, `pandadoc`, `process-street`, `sanity`, `signnow`, `todoist`, `wordpress-com`, `zapier`, `zoho-projects`
- **sales-and-marketing:** `ahrefs`, `attio`, `hubspot`, `adobe-journey-optimizer`, `adobe-marketing-agent`, `airops`, `apollo-io`, `aura`, `bitly`, `clarify`, `clay`, `close`, `common-room`, `crossbeam`, `g2`, `indeed`, `intuit-mailchimp`, `klaviyo`, `local-falcon`, `lusha`, `mailerlite`, `metaview`, `outreach`, `peec-ai`, `phoenix-by-hg-insights`, `quo`, `semrush`, `shopify`, `similarweb`, `surveymonkey`, `sybill`, `vibe-prospecting`, `workable`, `zoho-crm`, `zoominfo`
- **other:** `alma`, `aurora`, `candid`, `cocounsel-legal`, `courtlistener`, `definely`, `descrybe-legal-engine`, `everlaw`, `fever-event-discovery`, `gainsight`, `govtribe`, `harvey`, `instacart`, `interactive-brokers`, `lawve-ai`, `legal-data-hunter`, `legalzoom`, `lilt`, `melon`, `midpage-legal-research`, `pdf-viewer`, `play-sheet-music`, `playmcp`, `resy`, `shapes`, `solve-intelligence`, `tango`, `ticket-tailor`, `topcounsel-by-the-l-suite`, `trellis`, `udemy-business`, `verisk-xactrestore`

> Source of truth: `MCP_SERVERS` in `packages/shared/src/consts/providers/mcp-servers.ts`. If this list and the code diverge, the code wins — regenerate this section from `MCP_SERVERS[].id`.

---

## Step 3 — Run `novu connect` (keyless, non‑interactive)

Run the command **streamed / in the background** so you can read its output live (Step 4 depends on this). Keyless is the default — do **not** pass `--secret-key`. Substitute the channel the user picked.

```bash
node "$NOVU_CLI" connect "<CONFIRMED AGENT DESCRIPTION>" \
  --ci \
  --region local \
  --channel <slack|email|whatsapp|teams|skip>
```

- For **slack**, also pass the token: `--slack-config-token "<xoxe.xoxp-...>"`.
- `--ci` forces non‑interactive mode (no prompts, no TUI). Do **not** use `--ci` for `telegram` (it is rejected) — telegram must be run interactively by the user.
- The positional description is **required** in non‑interactive mode.
- Default runtime is the **demo** Claude runtime (no key). For **BYOK**, append: `--runtime claude --anthropic-api-key "sk-ant-..."`.
- **Transient Slack‑app‑creation failure:** for `slack`, if the run fails with `Failed to create Slack app: …` (Slack's app‑create can be slow on a cold first call), **silently re‑run the exact same command once** before reporting anything to the user — the step is safe to repeat. Only surface an error if the second attempt also fails.

---

## Step 4 — Channel‑specific handoff (human‑in‑the‑loop)

Watch stdout and act based on the channel the user picked:

- **slack** — Channel connection can't be automated. Watch for:

  ```
  → Authorize Slack here: <url>
  ```

  The moment it appears, give the user that URL and ask them to approve the Slack install **within 5 minutes**. The command finishes on its own once they authorize; if it times out (~5 min) it exits with an error — **re‑run the same command** (the Slack app is reused).

- **email** — Watch for:

  ```
  → Your agent's inbound address: <address>
  ```

  Give the user that address and ask them to send any email to it. The CLI polls **for 5 minutes** and completes once the email arrives; on timeout, re‑run after they've sent it. (Requires `NOVU_AGENT_SHARED_INBOUND_DOMAIN` on the API.)

- **whatsapp / teams** — The CLI prints a Novu Connect dashboard link and exits:

  ```
  → <Channel> continues in Novu Connect: <url>
  ```

  Give the user that link and tell them to finish the channel setup in the dashboard.

- **skip** — Nothing to hand off; the agent is created without a channel.

---

## Step 5 — Report the result

On success the CLI exits `0` and prints a block like:

```
✓ Your agent is live.
  Agent: <name> (<identifier>)
  → Check <Channel> — your agent just messaged you.      # connected channels (slack/email)
  → Finish <Channel> setup in Novu Connect — we opened it for you.   # dashboard channels (whatsapp/teams)
  Dashboard: <dashboard url>
```

Extract the **agent identifier** and **Dashboard URL** and tell the user:

- Their agent is live — go message it on the channel they connected (or finish the dashboard step for whatsapp/teams).
- **Keyless demo limit:** they get a handful of free replies (about 5). After that, the agent posts a **"Sign up & keep this agent"** link in the channel. Clicking it creates their Novu account and **migrates the agent, the channel connection, and the whole conversation** into their new workspace's Development environment — and the agent picks the conversation back up right where it left off.

On failure (non‑zero exit, or a line starting with `✗`), surface the error message and the matching fix:

| Symptom | Fix |
|---|---|
| `…requires --prompt "<agent description>"` | You didn't pass the positional description — re‑run Step 3 with it. |
| `…--slack-config-token "xoxe.xoxp-…"` | Ask the user for the Slack App Configuration Token (Step 1) and pass it. |
| `Failed to create Slack app: …` (e.g. timeout) | Transient — Slack's app‑create can be slow on a cold call. Silently re‑run the same command once; only surface to the user if it fails again. |
| `Slack OAuth was not completed within … seconds` | The user didn't approve in time — re‑run the same command (the Slack app is reused). |
| `We didn't see your email at … within …s` | The user hasn't emailed the inbound address yet — re‑run after they send it. |
| `Telegram setup is interactive only …` | Don't use `--ci` for telegram; have the user run it interactively, or pick another channel. |
| `Keyless environment creation is currently disabled` / no demo integration | The target API isn't configured for keyless/demo — confirm you're pointing at the right `--region`/`--api-url`, or have the user provide `--secret-key` for their existing account instead. |
| `credential input required …` | A BYOK runtime was selected without a key — pass `--anthropic-api-key` (or use the default demo runtime). |

---

## Command flag reference (the subset this flow uses)

| Flag | Purpose |
|---|---|
| `connect "<description>"` | Positional agent description (required in `--ci`). |
| `--ci` | Non‑interactive mode (omit for `telegram`). |
| `--region local` | Target the local stack (drop / change for other environments). |
| `--channel <slack\|email\|whatsapp\|teams\|telegram\|skip>` | Which channel to connect. |
| `--slack-config-token <xoxe.xoxp-…>` | Create the Slack app headlessly (slack only). |
| `--runtime claude --anthropic-api-key <sk-ant-…>` | Optional BYOK Claude runtime (default is the shared demo runtime). |
| `--secret-key <key>` | Optional — use an existing Novu account instead of keyless. |

---

## Limitations to keep in mind

- **One run = one new agent + one channel.** Re‑running `connect` creates another agent; there's no "add a channel to the existing agent" in this non‑interactive flow yet.
- **Channel support is uneven headlessly:** `slack` and `email` complete with one user action; `whatsapp`/`teams` finish in the dashboard; `telegram` is interactive‑only (QR) and not usable through this agent flow.
- Keyless data is temporary until the user claims it via the in‑channel sign‑up link.
