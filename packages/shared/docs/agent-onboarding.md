# Novu Agent Onboarding — instructions for an AI agent

You are an AI coding agent that helps a user create their first **Novu managed agent** and connect it to a **channel of their choice**, in **keyless mode** (no Novu account required up front).

Your job, end to end: collect a couple of inputs, infer the agent's purpose from the user's project, run **one** non-interactive CLI command, hand the user whatever they need to finish connecting the channel, then explain how they keep the agent by signing up.

**Out of scope:** Do not wire Novu into the user's codebase. This flow only creates a hosted agent and connects a channel.

---

## Operating principles

These govern every step. When in doubt, follow these over any specific instruction below.

- **One run, one outcome.** A single connect command creates one agent + connects one channel. Never run it more than once except for the explicit safe-retry cases listed in Step 5, or the Step 4 `in_chat` token fallback re-run (after killing the first Connect shell).
- **Trust user intent; ask only when genuinely unclear.** Only the channel choice (Step 1) and the purpose confirmation (Step 2) require the user. Default on everything else (region, runtime) unless the user raises it.
- **Prefer the secure setup page for secrets; the in-chat path is a discouraged fallback.** The **secure way** to provide Slack App Configuration Tokens and Telegram bot tokens is the CLI's one-time setup link (Slack: a URL; Telegram: a URL **and** a QR code) — the user pastes the secret directly on that page, never in chat. Always offer this first and recommend it. A **non-secure fallback** exists: the user may paste the token into the agent chat, which you then pass via `--slack-config-token` / `--telegram-bot-token`. Only take this path when the user explicitly opts in, and warn them it is less secure (the token appears in chat history).
- **Confirm before you act.** Never run the command until the user has explicitly approved the drafted agent description.
- **One Connect shell, no log watchers.** Run the Step 3 connect command in a single Shell session. Read stdout from that session (or **Await** its shell id). Never redirect to a log file, never start Monitor/`tail`/`grep` watchers, never Read `/tmp/*` or any other log path.
- **The CLI validates handoffs.** For `slack`/`email`, that Shell blocks and polls until OAuth or inbound email completes. Do not call Novu/Slack APIs or use OAuth tools to verify completion.
- **WhatsApp / MS Teams never reach the CLI.** They are not supported in this CLI flow. If the user picks one, do **not** run connect and do **not** generate an agent — redirect them to the Novu dashboard to sign in and continue onboarding there (Step 1).
- **Report conclusion-first.** Lead with the CLI's result (live / failed), then the one action the user must take. Keep it terse.
- **Use the option picker for decisions.** When the user must choose between fixed options, call the structured question tool — never ask decision questions as plain chat text. See [User decisions (option picker)](#user-decisions-option-picker).

---

## User decisions (option picker)

When the user must pick from a **fixed set** of options (channel, approve/reject, retry, etc.), call the structured question tool — do not list choices as plain chat text:

- **Cursor:** `AskQuestion` with 2–4 `options` (short `label` per option). 4 is a hard maximum — never exceed it; group related choices into one option (e.g. WhatsApp / MS Teams).
- **Claude Code:** `AskUserQuestion` with the same shape (`label` + optional `description`).

**Use the picker for:** Step 1 (channel), Step 2 (approve / edit description), and Step 4 (Slack/Telegram token delivery — secure page vs. paste in chat, presented inline only when the token is actually needed).

**Do not use the picker for:** free-text values (e.g. edited agent description prose) — ask in chat normally. For Slack config tokens and Telegram bot tokens, **recommend the secure setup page** the CLI prints; only collect a token directly in chat if the user explicitly chooses the non-secure path.

**If the tool is unavailable:** number options (`a1`, `a2`, …) and ask for a reply like `q1a2`.

---

## Glossary (shared language — use these terms)

| Term | Meaning |
|---|---|
| **Keyless mode** | Default. Creates a temporary agent with no Novu account. Do **not** pass `--secret-key`. |
| **Demo runtime** | Always used in this flow — shared Claude runtime, no API key needed. Limited to ~5 free replies. |
| **Handoff** | The channel-specific user action (authorize link or send email) that finishes connecting the channel. |
| **Dashboard redirect** | The WhatsApp / MS Teams path: no agent is created in the CLI — the user signs in to the Novu dashboard and continues onboarding there. |
| **Connect shell** | The one Shell invocation that runs the Step 3 connect command. All connect output lives here — not in log files or separate watch commands. |
| **CLI poll** | For `slack`/`email`, the Connect shell blocks up to ~5 min until the handoff completes. Success or timeout comes from its stdout only. |
| **Claim** | User signs up via the in-channel link, migrating the temporary agent + channel + conversation into their own workspace. |

---

## Flow overview

1. **Channel** — ask which channel. If the user picks WhatsApp / MS Teams, the flow ends here with a **dashboard redirect** — Steps 2–5 do not run.
2. **Purpose** — infer a 1–2 sentence agent description **for the product's end users** from the project; confirm with the user.
3. **Run** — connect command from Step 3 (keyless, `--ci`), streamed.
4. **Handoff** — read stdout; give the user the channel-specific next step (secure setup link, OAuth link, email, or Telegram deep link). For Slack/Telegram, present the inline secure-page-vs-paste-in-chat token choice here — only when the token is actually needed. Let the CLI poll (`slack`/`email`/`telegram`).
5. **Report** — relay the CLI's success or error; explain the demo limit → claim.

---

## Step 1 — Choose channel and collect inputs

**Goal:** lock the channel and gather only what that channel needs.

**Always ask the user to choose** — never assume. Call `AskQuestion` (Cursor) or `AskUserQuestion` (Claude Code) with these **four** options exactly — the picker has a **hard max of 4 options**, which is why WhatsApp and MS Teams share one option and **`skip` is not an option**. In the question's prompt text, add one short sentence that they can skip channel setup (agent only, connect later) by saying so:

| Option id | Label | What the user must do |
|---|---|---|
| `slack` | Slack | **Recommended (secure):** open the setup link the CLI prints and paste a Slack App Configuration Token there, then click an OAuth link to approve the install. **Non-secure fallback:** paste the token in chat instead and you pass it via `--slack-config-token`. |
| `email` | Email | Nothing up front. The CLI prints an inbound email address; the user sends one email to it. |
| `telegram` | Telegram | Create a bot via @BotFather. **Recommended (secure):** open the setup link/QR the CLI prints and paste the token there. **Non-secure fallback:** paste the token in chat instead and you pass it via `--telegram-bot-token`. Then tap **Start** on the bot in Telegram. |
| `dashboard` | WhatsApp / MS Teams | Not supported in the CLI — sign in to the Novu dashboard and continue onboarding there. |

**If they pick `dashboard`:** stop — do **not** run connect and do **not** generate an agent. WhatsApp and Microsoft Teams are not supported in this CLI flow. Give the user the dashboard URL — **<https://dashboard.novu.co>** (or <https://eu.dashboard.novu.co> if they asked for the EU region) — and tell them to **sign in (or sign up) and continue the onboarding from the dashboard**, where they can set up WhatsApp or Microsoft Teams. Steps 2–5 do not apply; you are done once you've delivered the link.

**If they ask to skip** (via the picker's built-in "Other" free-text, or plain chat): proceed with `--channel skip` — the agent is created without a channel; Steps 2–5 run as normal.

**Collect after they choose:**

- **slack / telegram** → collect **nothing** up front, and do **not** ask about token delivery yet — it is too early. Default the Step 3 connect run to the **secure path** (omit `--slack-config-token` / `--telegram-bot-token`). The secure-page-vs-paste-in-chat choice is presented **inline in Step 4**, lazily, at the exact moment the user must provide the token.
- **email / skip** → no extra input up front. Channel-specific actions happen via the CLI handoff links printed during Step 4.
- **dashboard (WhatsApp / MS Teams)** → no extra input; the flow already ended with the dashboard redirect above.

**Runtime:** always use the **demo runtime** — do not ask for an Anthropic API key and do not pass `--runtime` or `--anthropic-api-key`.

**Do not** ask for the agent name/description — you infer it next.

---

## Step 2 — Infer the agent's purpose, then confirm

**Goal:** produce one agent description the user signs off on.

**Persona rule:** infer **who the application is built for** and frame the agent for that audience. The agent acts on behalf of the product, serving its users — it is **never** a coding/ops assistant for the team building the project. If the product's users are developers (devtools, API platforms, SDKs), then and only then is a developer-facing agent correct.

Read the project to decide what the agent should *do*:

- `README.md`, `package.json` (name/description/keywords), and the app's primary source (routes, domain models, product copy).

While reading, build two lists:

1. **What the agent does** — tasks the end user would bring to the agent (answer questions about X, manage Y, …). Not repo/CI/ops tasks for the development team.
2. **What the end user actually uses** — external products the audience interacts with directly and would recognize by name: docs/KB (Notion), support chat (Intercom), payments (Stripe — only if they use Stripe's UI), team chat (Slack), and so on. These become the agent's **MCP servers** when named in the description. **Do not** put internal/backend infrastructure here — databases (PostgreSQL, MySQL, MongoDB), email delivery APIs (Resend, SendGrid), queues, caches, or cloud storage the user never sees. Do **not** include dev tooling (GitHub, Sentry, Linear, Jira) unless the product's audience is developers, or the dev tool is something the end user directly uses (e.g. a developer-docs agent that searches **Notion**).

**Never name what the end user doesn't use.** The description is the **entire input** to the server. It becomes the agent prompt; the server expands it into a system prompt, tools, skills, and **MCP server picks** — it attaches an MCP for every service name it finds. Naming PostgreSQL, Resend, or any other backend plumbing will wire integrations the agent should not have. Only name a service when the end user genuinely interacts with that product.

Then draft a concise **1–2 sentence description** that **must name the audience**. Name services from list 2 **only when the end user actually uses them** — omit integration clauses entirely when list 2 is empty. Required shape:

> _"A &lt;role&gt; for &lt;product&gt;'s &lt;audience — shoppers, members, ops staff, …&gt; that &lt;key tasks in domain language&gt;."_

When list 2 is non-empty, append **in/via** clauses for those end-user-facing services only:

> _"…that &lt;key tasks&gt; **in Notion**, and can &lt;action&gt; **via Intercom**."_

**Bad** (developer persona — wrong audience):

> _"A coding assistant for the Cellar team that reviews PRs **in GitHub** and triages errors **in Sentry**."_

**Bad** (internal infrastructure named — server will attach wrong MCPs):

> _"An inventory assistant for Cellar's wine bar staff that checks stock **in PostgreSQL** and sends confirmations **via Resend**."_

**Good** (audience named, domain tasks only — no infra the user doesn't touch):

> _"An inventory assistant for Cellar's wine bar staff that helps them check wine stock levels, par, vendor details, purchase orders, and invoices."_

**Good** (end-user-facing integration named — user actually uses Intercom):

> _"A support assistant for Acme's customers that answers billing questions and looks up order status, and can escalate live chats **via Intercom**."_

**Before showing the draft, self-check:**

1. The audience is named and every task is something that audience would ask for — no developer-persona drift.
2. No internal infrastructure, email APIs, databases, or dev tooling the end user doesn't directly use.
3. Every service in list 2 appears by name; if list 2 is empty, no integration names appear.

If any check fails, rewrite — do not show a draft that fails.

Show the draft and briefly note the inferred audience (e.g. "this agent will serve Cellar's wine bar staff") and any end-user-facing integrations it names and why, then call `AskQuestion` / `AskUserQuestion` with:

| Option id | Label |
|---|---|
| `approve` | Looks good — run connect |
| `edit` | I want to change the description |

If they pick **edit**, ask for their revised text in chat (not the picker), update the draft, and ask again until they pick **approve**. If their revision drops a service name, warn once that the agent will lose that integration — but their wording wins. **Never run the command until they approve.**

---

## Step 3 — Run connect (keyless, non-interactive)

**Goal:** create the agent and start the channel connection in one Connect shell.

Keyless is the default — do **not** pass `--secret-key`. Substitute the channel the user picked. Run the command **exactly as written** — no `>`, `tee`, or log file.

Set the agent description in an environment variable first — do **not** paste user-provided prose directly into a double-quoted shell argument (command substitution would execute inside `"…"`).

```bash
export NOVU_AGENT_DESCRIPTION='<confirmed agent description>'

npx novu connect "$NOVU_AGENT_DESCRIPTION" \
  --ci \
  --channel <slack|email|telegram|skip>
```

Never pass `--channel whatsapp` or `--channel teams` — those channels are handled entirely by the dashboard redirect in Step 1 and must not generate an agent via the CLI.

**Canonical example (slack):**

```bash
export NOVU_AGENT_DESCRIPTION='<confirmed agent description>'

npx novu connect "$NOVU_AGENT_DESCRIPTION" \
  --ci \
  --channel slack
```

**How to run the Connect shell** — pick one path; never combine with log redirection or a second watch command:

- **If channel is `slack`, `email`, or `telegram`:** Shell with `block_until_ms: 0` (background). Use **Await** on that shell id to read output as it arrives (e.g. pattern `NOVU_CONNECT_SLACK_SETUP_URL=`, `NOVU_CONNECT_TELEGRAM_SETUP_URL=`, `NOVU_CONNECT_INBOUND_ADDRESS=`, or `NOVU_CONNECT_SLACK_AUTHORIZE_URL=` / `NOVU_CONNECT_TELEGRAM_DEEPLINK_URL=`). When the user finishes the handoff, **Await** again until `✓ Your agent is live` or a `✗` error. Do not use Monitor, `tail -f`, `grep`, Read on log files, or ask for permission to watch logs.
- **If channel is `skip`:** a normal foreground Shell is enough — the CLI exits quickly after printing the success block.

Conditional flags — apply each only when its condition holds:

- **Prefer the secure setup links** over `--slack-config-token` / `--telegram-bot-token`. The **first** connect run always omits those flags so the CLI issues a secure setup page (URL for Slack; URL + QR for Telegram). Pass `--slack-config-token` / `--telegram-bot-token` **only** on a Step 4 re-run, after the user explicitly chose the non-secure in-chat path at the inline token prompt (or for genuine headless CI where secrets are injected via environment variables). When you do pass a token, set it via an environment variable first — never paste the raw secret into the command line.
- **Runtime:** do not pass `--runtime` or `--anthropic-api-key` — the **demo runtime** is always used.
- **Region:** pass `--region eu` only when the user explicitly asks; otherwise the default is **US** Novu Cloud.

**Example — Step 4 Slack re-run (`in_chat` path):**

```bash
export NOVU_AGENT_DESCRIPTION='<confirmed agent description>'
export SLACK_CONFIG_TOKEN='<xoxe.xoxp-...>'

npx novu connect "$NOVU_AGENT_DESCRIPTION" \
  --ci \
  --channel slack \
  --slack-config-token "$SLACK_CONFIG_TOKEN"
```

Always required: the positional description (in `--ci` mode).

**Safe retry — Slack only:** if the run fails with `Failed to create Slack app: …` (Slack's app-create can be slow on a cold first call), **silently re-run the exact same command once** before reporting anything — the step is safe to repeat. Only surface an error if the second attempt also fails.

---

## Step 4 — Channel-specific handoff (human-in-the-loop)

**Goal:** give the user the one action that finishes connecting their channel.

**If channel is `slack`, `email`, or `telegram`:** deliver the handoff from the Connect shell stdout, then **Await** the same shell until the **CLI poll** finishes. Do not start a separate watch process, read log files, or validate OAuth/email/Telegram yourself.

**Always paste the literal URL — never a placeholder.** Every handoff link must be the full resolved value copied verbatim from the matching `NOVU_CONNECT_*` line (everything after the `=`). **Never** send a message that refers to "the secure link below", "the setup link", or "the link above" without the actual `https://…` URL in that same message. If you have not yet captured the URL from stdout, **Await** the matching pattern (e.g. `NOVU_CONNECT_SLACK_SETUP_URL=`) **before** sending any handoff message — do not announce the handoff until you have the real URL in hand.

Read Connect shell stdout (via **Await**, not log files) and act based on the chosen channel:

- **slack** — the connect run defaulted to the secure path, so first **Await** the secure setup link line and copy its value:

  ```text
  NOVU_CONNECT_SLACK_SETUP_URL=<url>
  ```

  This is the moment the user must provide the token, so **now** present the token-delivery choice inline — call `AskQuestion` / `AskUserQuestion` with two options and recommend `secure`:
  - `secure` — **Secure setup page (recommended)** — paste the token on the page the CLI printed; it never enters chat.
  - `in_chat` — **Paste token in chat (less secure)** — the token then lives in chat history.

  **If they pick `secure` (or skip the choice):** paste that exact `<url>` into chat as a clickable link. Then tell them to:
  1. Open <https://api.slack.com/apps> and generate an **App Configuration Token** (access token starting with `xoxe.xoxp-`)
  2. Open the setup link and paste the token there — **not in this chat**

  The CLI polls until the token is saved (~5 min). Then **Await** the OAuth handoff line and copy its value:

  ```text
  NOVU_CONNECT_SLACK_AUTHORIZE_URL=<url>
  ```

  Paste that exact `<url>` into chat and ask them to approve the install within 5 minutes. **Await** until the CLI poll finishes. Re-run on timeout (the Slack app is reused).

  **If they pick `in_chat`:** ask for the token in chat as free-text (not the picker), warn once that it will live in chat history, then **kill the first Connect shell** (the Step 3 process still polling the secure setup page) and **re-run the Step 3 connect command once with `--slack-config-token`** (set via an env var). That supersedes the secure setup page — the CLI skips the `NOVU_CONNECT_SLACK_SETUP_URL` handoff and goes straight to OAuth. **Await** the `NOVU_CONNECT_SLACK_AUTHORIZE_URL=<url>` line, paste that exact URL into chat, and ask them to approve the install within 5 minutes.

- **email** — watch for these machine-readable lines (plain stdout, no ANSI):

  ```text
  NOVU_CONNECT_INBOUND_ADDRESS=<address>
  NOVU_CONNECT_MAILTO=<mailto-url>
  NOVU_CONNECT_SEND_FROM_EMAIL=<email>   # only when present
  ```

  Give the user:
  1. The **mailto link** (`NOVU_CONNECT_MAILTO=…`) — one click opens a pre-filled draft in their mail client; this is the primary handoff.
  2. The **inbound address** as a copy-paste fallback.
  3. If `NOVU_CONNECT_SEND_FROM_EMAIL` is present, tell them to send **from that address** so the agent can reply.

  Then wait for the **CLI poll** — the process completes once the email arrives; on timeout, re-run after they've sent it.

- **telegram** — the connect run defaulted to the secure path. First, watch for the BotFather hint and secure setup link:

  ```text
  NOVU_CONNECT_TELEGRAM_BOTFATHER_URL=<url>              # only when present
  NOVU_CONNECT_TELEGRAM_SETUP_URL=<url>
  NOVU_CONNECT_TELEGRAM_SETUP_QR_PNG=<absolute png path>   # only when present
  ```

  Tell the user to create a bot with @BotFather (<https://t.me/botfather>, send `/newbot`). The bot token is needed next, so **now** present the token-delivery choice inline — call `AskQuestion` / `AskUserQuestion` with two options and recommend `secure`:
  - `secure` — **Secure setup page (recommended)** — paste the token on the page/QR the CLI printed; it never enters chat.
  - `in_chat` — **Paste token in chat (less secure)** — the token then lives in chat history.

  **If they pick `secure` (or skip the choice):** open the **setup link** and paste the BotFather confirmation message there — **not in this chat**. **Embed the secure-setup QR PNG (`NOVU_CONNECT_TELEGRAM_SETUP_QR_PNG`) inline when present** so the user can scan the secure link on their phone — do not just describe it. Always paste the literal `NOVU_CONNECT_TELEGRAM_SETUP_URL` value alongside the QR. The CLI polls until the bot token is saved (~5 min).

  **If they pick `in_chat`:** ask for the token in chat as free-text (not the picker), warn once that it will live in chat history, then **kill the first Connect shell** (the Step 3 process still polling the secure setup page) and **re-run the Step 3 connect command once with `--telegram-bot-token`** (set via an env var). That supersedes the secure setup page — the CLI skips the `NOVU_CONNECT_TELEGRAM_SETUP_URL`/QR handoff and goes straight to the deep-link step below.

  Then watch for the deep-link handoff:

  ```text
  NOVU_CONNECT_TELEGRAM_DEEPLINK_URL=<url>
  NOVU_CONNECT_TELEGRAM_BOT_USERNAME=<name>
  NOVU_CONNECT_TELEGRAM_DEEPLINK_QR_PNG=<absolute png path>   # only when present
  ```

  Embed the QR PNG inline when present. Ask them to open the bot and tap **Start** on `@<botUsername>`. **Await** until the CLI poll finishes. Re-run on timeout with the same command.

- **skip** — nothing to hand off; the agent is created without a channel.

(`whatsapp`/`teams` never reach this step — they were redirected to the dashboard in Step 1.)

---

## Step 5 — Report the result

**Goal:** relay what the CLI printed, point the user at the channel, explain the claim path.

On success the CLI exits `0` and prints a block like:

```text
✓ Your agent is live.
  Agent: <name> (<identifier>)
  → Check <Channel> — your agent just messaged you.      # connected channels (slack/email)
  Dashboard: <dashboard url>
```

Extract the **agent identifier** and **Dashboard URL**, then tell the user:

- Their agent is live — go message it on the connected channel.
- **Keyless demo limit:** they get ~5 free replies. After that, the agent posts a **"Sign up & keep this agent"** link in the channel. Clicking it creates their Novu account and **migrates the agent, the channel connection, and the whole conversation** into their new workspace's Development environment — the agent picks up right where it left off.

**On failure** (non-zero exit, or a line starting with `✗`), surface the error message and the matching fix:

| Symptom | Fix |
|---|---|
| `…requires --prompt "<agent description>"` | You didn't pass the positional description — re-run Step 3 with it. |
| `The Slack App Configuration Token wasn't saved within … seconds` | User didn't paste the token on the setup page in time — re-run the same command for a fresh link. |
| `Failed to create Slack app: …` (e.g. timeout) | Transient — Slack's app-create can be slow on a cold call. Silently re-run the same command once; only surface if it fails again. |
| `Slack OAuth was not completed within … seconds` | User didn't approve in time — re-run the same command (the Slack app is reused). |
| `We didn't see your email at … within …s` | User hasn't emailed the inbound address yet — re-run after they send it. |
| `The bot token wasn't saved within … seconds` | User didn't paste the BotFather token on the setup page in time — re-run for a fresh link. |
| `Telegram didn't accept the bot token: …` | Wrong or revoked token on the setup page — have the user re-copy from @BotFather and re-run. |
| `We didn't see a /start message on @… within … seconds` | User didn't tap Start on the bot in time — re-run the same command. |
| `Keyless environment creation is currently disabled` / no demo integration | Target API isn't configured for keyless/demo — confirm the right `--region`, or have the user provide `--secret-key` for their existing account. |

---

## Command flag reference (the subset this flow uses)

Run `novu connect --help` for copy-paste examples, the non-interactive (agent/CI) contract, machine-readable stdout markers, and exit-code semantics. Keep that help text in sync when changing connect flags or behavior.

| Flag | Purpose |
|---|---|
| `connect "<description>"` | Positional agent description (required in `--ci`). |
| `--ci` | Non-interactive mode (required for all channels in this flow). |
| `--region <us\|eu>` | Target Novu Cloud region (default: `us`). |
| `--channel <slack\|email\|telegram\|skip>` | Which channel to connect. Never pass `whatsapp`/`teams` — those are handled by the dashboard redirect, not the CLI. |
| `--slack-config-token <xoxe.xoxp-…>` | Non-secure alternative (or headless CI): pass the Slack config token directly instead of using the secure setup page. Use only when the user opts in. |
| `--telegram-bot-token <123456:ABC…>` | Non-secure alternative (or headless CI): pass the BotFather token directly instead of using the secure setup page. Use only when the user opts in. |
| `--secret-key <key>` | Optional — use an existing Novu account instead of keyless. |

---

## Limitations to keep in mind

- **One run = one new agent + one channel.** Re-running `connect` creates another agent; there is no "add a channel to the existing agent" in this non-interactive flow yet. The Step 4 `in_chat` re-run is the one deliberate exception — it still creates a second agent (the first, from the secure-path attempt, is left unconnected). Prefer the secure path to avoid duplicates.
- **Channel support is uneven headlessly:** `slack` and `telegram` each require two user actions (paste a secret on the secure setup page, then OAuth or tap Start); `email` completes with one user action; `whatsapp` and `teams` are **not supported in the CLI** — the user signs in to the Novu dashboard and continues onboarding there (no agent is generated by this flow).
- **Prefer the secure setup page for Slack/Telegram tokens.** The CLI prints one-time setup links (`NOVU_CONNECT_SLACK_SETUP_URL`, `NOVU_CONNECT_TELEGRAM_SETUP_URL`; Telegram also a QR) that work without signing in to the dashboard — including in keyless mode. A non-secure fallback (paste the token in chat → `--slack-config-token` / `--telegram-bot-token`) is available only when the user explicitly opts in; warn them the token then lives in chat history.
- Keyless data is temporary until the user claims it via the in-channel sign-up link.
- The CLI stores keyless credentials **per API URL**, so switching `--region` between runs does not require clearing `~/.config/configstore/novu-cli.json`.

---

## Definition of done

**If the user picked WhatsApp / MS Teams:** you are done as soon as you've delivered the dashboard sign-in URL and told them to continue onboarding there — no agent is generated, and the items below do not apply.

You are done when:

1. The user picked a channel (secrets went through the secure setup page unless the user explicitly opted into the non-secure in-chat path).
2. The user confirmed the agent description.
3. You delivered the handoff (link / address) — or noted `skip`.
4. The Connect shell printed `✓ Your agent is live.` (exit `0`). You never used Monitor, log files, or a separate watch command; for `slack`/`email`/`telegram`, the **CLI poll** validated the handoff.
5. You reported the agent identifier + Dashboard URL and explained the demo limit → claim path.
