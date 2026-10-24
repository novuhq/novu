# @agentinbox/cli

**An inbox for your agent.** Agents are connected to everything — except the people they work for. Agent Inbox gives any agent an inbox on Telegram, Slack and email: people write to it, and it can ask a real person a question and block until they answer.

```bash
# One-time, by the operator. Asks for your name and email, creates the inbox, then offers Telegram or Slack:
npx @agentinbox/cli setup
# Connect one more channel later:
npx @agentinbox/cli channel add telegram
npx @agentinbox/cli channel add slack
npx @agentinbox/cli channel add email

# Keep it in an Agent Inbox account: sign in or up on agentinbox.md, no secret key to copy:
npx @agentinbox/cli login

# Connect one more host (Claude Code, Cursor, a routine) to your agent, with a code from agentinbox.md:
npx @agentinbox/cli connect atlas --code BCDF-GHJK

# Forever after, by any agent on the machine:
npx @agentinbox/cli inbox send ask "Which environment should I deploy to?"
npx @agentinbox/cli inbox send approve "Delete 342 stale records from prod?"
npx @agentinbox/cli inbox send choose "Pick a release strategy" --option canary --option blue-green
npx @agentinbox/cli inbox send "Nightly build finished — 0 failures."

# Invite another person — share the printed link; they pick Telegram, Slack or email on a page
# and choose their default (does not change who you are on this computer):
npx @agentinbox/cli contact invite alice --name "Alice Chen"
# …or skip the page and link them on one channel (it becomes their default):
npx @agentinbox/cli contact invite bob --via telegram --async
npx @agentinbox/cli contact invite carol@acme.com          # email: they verify the address first

# Give your agent a name and a description at setup:
npx @agentinbox/cli setup telegram --agent-name "Deploy bot" --agent-description "Asks before it ships."

# See who agents can reach (`(you)` marks the operator):
npx @agentinbox/cli contact list
npx @agentinbox/cli contact list --json
```

## The inbox

People can also write to your agent first. Everything said in one place on one channel is a conversation.

```bash
npx @agentinbox/cli inbox list                          # open conversations with your contacts
npx @agentinbox/cli inbox list --filter unread --wait --timeout 10m   # block until something arrives (exit 11 on timeout)
npx @agentinbox/cli inbox list --senders all            # include conversations with strangers
npx @agentinbox/cli inbox show conv_123                 # read a conversation; this does not mark it read
npx @agentinbox/cli inbox reply conv_123 "On it."                        # reply in the conversation
npx @agentinbox/cli inbox reply conv_123 approve "Deploy?" --to alice    # ask one person inside a conversation
npx @agentinbox/cli inbox read conv_123                 # seen, no reply needed
npx @agentinbox/cli inbox resolve conv_123              # finished; opens again when anyone writes
```

| Command | Where it lands | Who may answer |
|---|---|---|
| `send` with no `--to` | a new conversation with you (or `INBOX_TO`) | you |
| `send --to alice` | a new conversation with Alice | Alice |
| `reply conv_123` | that conversation | the contact it belongs to, or anyone already in it when it has no contact |
| `reply conv_123 --to alice` | that conversation | only Alice |
| `reply conv_123 --anyone` | that conversation | anyone in it, strangers included |

- `send` and `reply` take a plain message, or `ask`, `approve` or `choose` followed by the question. A plain message does not wait; the three questions block until answered.
- A conversation is unread when someone wrote something that was not an answer to a question, and your agent has not responded since. Sending into a conversation, `read` and `resolve` mark it read; `show` does not.
- `--to` reaches contacts only. A stranger (someone who wrote without being a contact) is answered with `reply`. A question in a conversation that has no contact goes to everyone already in it. `--anyone` opens a question to everyone when the conversation does have a contact.
- `--to` also takes an email address. On a new conversation that address is sent as typed: a claimed organization delivers it without a confirmation click, and a keyless setup is told to claim an account. A reply still needs a contact that already verified that address.
- A plain message is sent as text. It becomes a card when you pass `--subtitle`, `--body` or `--icon`.
- Every send prints the conversation it landed in, and warns when that conversation had unread messages.
- Who can reach your agent, pausing it and deleting it are settings on [agentinbox.md](https://www.agentinbox.md), not commands. While the agent is paused, every command that reads the inbox or sends exits `1` with an error that says so; messages people send meanwhile wait in the inbox.

## How it works

- `setup` provisions a keyless environment (no account needed), a hidden relay agent, and links **your** channel — Telegram via QR, Slack via app install, Email by registering your address (approvals arrive as button emails; answer questions by replying). Add more channels with `channel add <channel>`. `channel list` shows the channels you connected and marks your default. Linked channels live on the server; `channel default slack` sets a local preference for where **your** messages land when you don't pass `--via` (other people get their own default).
- Telegram is a private bot only you control. On a terminal, `channel add telegram` asks whether to paste the BotFather token here or finish on a page at [agentinbox.md](https://www.agentinbox.md) (QR or browser). Without a terminal it prints that page and waits. The CLI finishes as soon as you tap **Start** (up to 15 minutes). Running it again resumes at whatever step is left. `--telegram-bot-token <token>` skips the choice.
- Slack works the same way: paste an App Configuration Token (`xoxe.xoxp-…`) in the terminal, or open the setup page and then click **Add to Slack**. `--slack-config-token <token>` skips the choice.
- `login` opens agentinbox.md, where you sign in (or sign up), check that the page shows the same code as your terminal, and approve; the CLI then saves your Agent Inbox account's key. Deny there stops the login. A keyless setup made on this computer moves into the account on the same page, so your channels keep working. After logging in, the CLI saves the contact your account has for you as who agents reach by default, so you are the same person here, on the dashboard and on any other computer, on the channels you already connected. When the account has no such contact yet, it asks who you are and makes one.
- `connect <agent> --code <code>` is the other way round from `login`: agentinbox.md shows a one-time code, and the host types it in its terminal. No browser is needed on that computer, so it suits an agent you hand a prompt to. `<agent>` is the agent's address before the `@`. The code works once, for 10 minutes; a used, expired or wrong code fails with a message that says which, and an agent takes only a few wrong codes at a time. The CLI saves the same key `login` does, so every command on that computer then acts as the agent. When the computer already has a setup, `connect` asks before replacing it (without a terminal it stops and says to pass `--yes`); the code isn't used until you agree. Each agent can have several hosts; the dashboard shows each one by name (Claude Code, Codex, …) and when it last checked the inbox. The CLI tells which host runs it from the shell it runs in, or else from the host the code was made for; one it can't name shows as General.
- `contact invite` gives you a link to share with a **different** person — nothing is sent for you. Without `--via` it opens a page (valid for 3 days) where they connect any channel you set up — Telegram, Slack, and/or Email — and pick their default. With `--via telegram|slack` you get the direct connect link instead (a Slack authorize URL or Telegram deep link, valid for minutes). Pass an email address instead of an id (or `--via email --email <address>`) and a verification email is sent. They must click **Verify this email** before a send that names their contact id can use email. A send that names the address itself does not wait for that click when the organization is claimed. The contact's id comes from the address (`alice@acme.com` becomes `alice`, with a short suffix when `alice` is taken). Then `--to alice` reaches them on their default channel. Pass `--name "Alice Chen"` so they show up by name.
- `contact list` lists the contacts — every person `--to` can address — so an agent can check who exists before coordinating between people. It's a directory, not a reachability check: if delivery fails with "no linked endpoint", `contact invite` them on that channel.
- Agents stay channel-blind: routing is the person's preference — the default they picked on the invite page, or the first channel they connected. `--via telegram|slack|email` on `send` is a rare per-call **delivery** override, not how you onboard someone.
- Every command has the shape `<command> <action>`: `setup`, `login`, `connect`, `inbox`, `contact`, `channel`.
- `ask`, `approve` and `choose` deliver a one-off message (with action buttons where relevant) and **block** until the person answers, the `--ttl` expires, or `--timeout` elapses.
- Answers flow back through button clicks or plain replies; the CLI prints the answer and your agent continues.
- In a terminal, `setup`, `login` and `connect` (and `channel add`) draw one screen and keep it up to date in place: your agent's mascot in dots, the command, a list of what it did with a ✔ for each step done, and what it is waiting for. The mascot blinks while it waits for you, smiles once something is connected, and falls asleep when a wait runs out or something fails. Questions are asked below the screen, and your answers join the list. The screen is only drawn for a person at a terminal: never into a pipe, a file or CI, or with `NO_COLOR`, `FORCE_COLOR=0` or `TERM=dumb` set, or in a terminal narrower than 48 columns. There the commands print exactly what they always printed, so what agents read stays the same. The agent-facing commands (`inbox`, `contact`) never draw it. Three settings change how it looks:
  - `AGENTINBOX_NO_ANIMATION=1` stands it still: the mascot's still faces, no blinking and no spinner.
  - `AGENTINBOX_THEME=light` or `dark` says whether your terminal's background is light or dark, where the terminal can't be asked (the CLI asks it, then goes by `COLORFGBG`, then takes dark).
  - `AGENTINBOX_MASCOT_ASPECT=1.2` says how tall a row of braille dots is for a dot's width (1 is square), where the mascot comes out oval because the terminal doesn't say how big its characters are.

## Exit codes (stable contract for agents)

| Code | Meaning |
| ---- | ------- |
| `0`  | answered / approved / chosen / delivered |
| `10` | denied |
| `11` | timed out waiting — still pending; the answer shows up in the conversation (`inbox show <id>`) |
| `12` | expired or canceled |
| `1`  | error |

## Useful flags

- `--from deploy-bot` — attribution shown to the person ("Requested by deploy-bot").
- `--ttl 2h` — how long a question stays answerable (default 24h, max 5d).
- `--timeout 10m` — max time this invocation blocks; on timeout it exits `11` and the answer later shows up in the conversation.
- `--async` — don't block; return at once and check the conversation later.
- `--json` — the full result for programmatic parsing.
- `--to <id|email>` — address a contact who is already linked (`contact list` to find them, `contact invite` to add them), or comma-separated contacts (`alice,bob`, max 50) so any listed person can settle.
- `--via <channel>` — on `send`: deliver on a specific linked channel instead of the person's default.
- `--icon` — Slack-only card icon: MCP catalog id (`stripe`) or https URL (32×32). Ignored on other channels.
- `--subtitle`, `--body` — optional card chrome on every send.
- `--approve-label`, `--deny-label`, `--extra-action <id:label>` — `approve` only (repeat `--extra-action`).
- `--option <id:label>` — `choose` only; options can keep a stable id (`stg:Staging`); a bare label still works.

## Auth & headless use

`login`, `connect` and `setup` store credentials in `~/.agentinbox/config.json`; `setup` reuses a saved login. On a self-hosted deployment, pass `setup --secret-key <key>` or set `INBOX_SECRET_KEY` (and `INBOX_API_URL`, its Agent Inbox dashboard's `/api`) for an existing environment. `INBOX_SECRET_KEY` takes priority over the saved login.

Without a login, `setup` creates a keyless environment: a free demo with a small message allowance. Run `login` anytime to keep it; your channels and relay move into your Agent Inbox account. Once the allowance is used up, the next command exits `1` and asks you to run `login` instead of delivering the message (a sign-up link is also sent to you on your linked channel; if you use it, run `login` afterwards).

In containers, sandboxes, and CI — anywhere no config file exists — the CLI is fully operational from environment variables alone:

```bash
docker run -e INBOX_SECRET_KEY=... -e INBOX_TO=alice -e INBOX_VIA=slack agent \
  npx @agentinbox/cli inbox send approve "Deploy to prod?"
```

- `INBOX_TO` — default recipient contact id(s), comma-separated like `--to` (max 50).
- `INBOX_VIA` — default channel (`telegram`, `slack`, or `email`), like `--via`.
- `INBOX_API_URL` — API URL override, like `--api-url`. The default is `https://www.agentinbox.md/api`, the Agent Inbox API, which forwards to Novu Cloud's API. On a self-hosted or local deployment, point it at that deployment's Agent Inbox dashboard (`/api`, such as `http://localhost:4300/api`), not at the Novu API itself.
- `INBOX_CONFIG` — config file path override.

Precedence is always **CLI flags > environment variables > `~/.agentinbox/config.json`**, and env values are never written back to the config file.

## Teaching your coding agent to use it

The Agent Inbox skills (the [agentskills.io](https://agentskills.io) `SKILL.md` format) teach Claude Code, Cursor,
Codex and other coding agents *when* to reach for the inbox — background/autonomous runs, risky or irreversible
actions, genuine multi-way decisions — versus just asking you directly in an active chat, and how to set up the CLI
and the MCP server. They live in their own repository, [agentinboxhq/skills](https://github.com/agentinboxhq/skills),
and `setup` ends by showing the command that installs them:

```bash
npx skills add agentinboxhq/skills                        # every skill, for the coding agents in this project
npx skills add agentinboxhq/skills --agent claude-code    # for one agent
npx skills update                                         # later: the latest version
```

In Claude Code they also install as a plugin, which adds the Agent Inbox MCP server too:
`/plugin marketplace add agentinboxhq/skills`, then `/plugin install agentinbox@agentinbox`.
`claude plugin update agentinbox@agentinbox` updates it later.
