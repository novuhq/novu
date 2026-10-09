# @novu/human

**An inbox for your agent.** Agents are connected to everything — except the humans they work for. `human` gives any agent an inbox on Telegram, Slack and email: people write to it, and it can ask a real person a question and block until they answer.

```bash
# One-time, by the human (interactive picker, or name the channel):
npx @novu/human setup
npx @novu/human setup telegram
npx @novu/human setup slack
npx @novu/human setup email

# Keep it in a Human account: sign in or up on gethuman.md, no secret key to copy:
npx @novu/human login

# Forever after, by any agent on the machine:
human inbox ask "Which environment should I deploy to?"
human inbox approve "Delete 342 stale records from prod?"
human inbox choose "Pick a release strategy" --option canary --option blue-green
human inbox tell "Nightly build finished — 0 failures."

# Invite another human — share the printed link; they pick Telegram or Slack on a Novu page
# and choose their default (does not change your local identity):
human contact invite alice --name "Alice Chen"
# …or skip the page and link them on one channel (it becomes their default):
human contact invite bob --via telegram --async
human contact invite carol --via email --email carol@acme.com

# Give your agent a name and a description, at setup or later:
npx @novu/human setup telegram --agent-name "Deploy bot" --agent-description "Asks before it ships."
human agent update --name "Deploy bot"
human agent update --picture ./avatar.png      # a JPEG or PNG up to 2 MB, or a web address; needs `human login`

# See who agents can reach (subscribers in the environment; `(you)` marks the operator):
human contact list
human contact list --json
```

## The inbox

People can also write to your agent first. Everything said in one place on one channel is a thread.

```bash
human inbox list                          # open threads from your contacts
human inbox list --filter unread --wait --timeout 10m   # block until something arrives (exit 11 on timeout)
human inbox list --senders all            # include threads from strangers
human inbox show conv_123                 # read a thread; this does not mark it read
human inbox tell "On it." --thread conv_123              # reply in the thread
human inbox approve "Deploy?" --thread conv_123 --to alice   # ask one person inside a thread
human inbox read conv_123                 # seen, no reply needed
human inbox resolve conv_123              # finished; opens again when anyone writes
```

| Flags on `ask` / `approve` / `choose` / `tell` | Where it lands | Who may answer |
|---|---|---|
| neither | a new thread with you | you |
| `--to alice` | a new thread with Alice | Alice |
| `--thread conv_123` | that thread | anyone in it |
| `--thread conv_123 --to alice` | that thread | only Alice |

- A thread is unread when someone wrote something that was not an answer to a question, and your agent has not responded since. Sending into a thread, `read` and `resolve` mark it read; `show` does not.
- `--to` reaches contacts only. A stranger (someone who wrote without being a contact) is answered with `--thread`.
- `tell` sends plain text. It becomes a card when you pass `--subtitle`, `--body` or `--icon`.
- Every send prints the thread it landed in, and warns when that thread had unread messages.

## How it works

- `setup` provisions a keyless Novu environment (no account needed), a hidden relay agent, and links **your** channel — Telegram via QR, Slack via app install, Email by registering your address (approvals arrive as button emails; answer asks by replying). Add more channels with `human channel add <channel>`. Linked channels live on the server; `human channel default slack` sets a local preference for where **your** interactions land when you don't pass `--via` (other people get their own default).
- `login` opens gethuman.md, where you sign in (or sign up), check that the page shows the same code as your terminal, and approve; the CLI then saves your Human account's key. Deny there stops the login. A keyless setup made on this computer moves into the account on the same page, so your channels keep working. After logging in, the CLI saves the contact your account has for you as who agents reach by default, so you are the same person here, on the dashboard and on any other computer, on the channels you already connected. When the account has no such contact yet, it asks who you are and makes one.
- `contact invite` gives you a link to share with a **different** person — nothing is sent for you. Without `--via` it opens a Novu page (valid for 3 days) where they connect any channel you set up — Telegram, Slack, or both — and pick their default. With `--via telegram|slack|email` you get the direct connect link instead (a Slack authorize URL or Telegram deep link, valid for minutes; email needs no link), and that channel becomes their default. Your `~/.novu/human.json` subscriberId stays yours. Then `--to alice` reaches them on their default channel. Pass `--name "Alice Chen"` so they show up by name.
- `agent show` shows who your agent is to the people it talks to, and `agent update --name` / `--description` change it. The name is what the invite page says ("Deploy bot would like to reach you"), who its emails come from, and what its Telegram bot and a new Slack app are called. `--picture` gives it a face on the invite page and on its Telegram bot; it needs an account, so run `human login` first. A Slack app that already exists keeps its name and icon; change those in its Slack settings.
- `contact list` lists the environment's subscribers — every person `--to` can address — so an agent can check who exists before coordinating between people. It's a directory, not a reachability check: if delivery fails with "no linked endpoint", `contact invite` them on that channel.
- Agents stay channel-blind: routing is the human's preference — the default they picked on the invite page, or the first channel they connected. `--via telegram|slack|email` on ask/approve is a rare per-call **delivery** override, not how you onboard someone.
- Every command has the shape `human <thing> <action>`: `inbox`, `interaction`, `contact`, `channel`, `agent`, `skill`.
- Each `ask`, `approve` and `choose` delivers a one-off message (with action buttons where relevant) and **blocks** until the human answers, the `--ttl` expires, or `--timeout` elapses.
- Answers flow back through button clicks or plain replies; the CLI resolves and your agent continues.

## Exit codes (stable contract for agents)

| Code | Meaning |
| ---- | ------- |
| `0`  | answered / approved / chosen / delivered |
| `10` | denied |
| `11` | timed out waiting — still pending, resume with `human interaction wait <id>` |
| `12` | expired or canceled |
| `1`  | error |

## Useful flags

- `--from deploy-bot` — attribution shown to the human ("Requested by deploy-bot").
- `--ttl 2h` — how long the request stays answerable (default 24h, max 72h).
- `--timeout 10m` — max time this invocation blocks; on timeout it prints the id so `human interaction wait <id>` can resume.
- `--async` — don't block; print the interaction id immediately.
- `--json` — full interaction object for programmatic parsing.
- `--to <humanId>` — address a human who is already linked (`human contact list` to find them, `human contact invite` to add them), or comma-separated humans (`alice,bob`, max 50) so any listed person can settle.
- `--via <platform>` — deliver on a specific linked channel instead of the human's default.
- `--icon` — Slack-only card icon: MCP catalog id (`stripe`) or https URL (32×32). Ignored on other channels.
- `--subtitle`, `--body` — optional card chrome on ask / approve / choose / tell.
- `--approve-label`, `--deny-label`, `--extra-action <id:label>` — approve-only button chrome (repeat `--extra-action`).
- `--option <id:label>` — choose options can keep a stable id (`stg:Staging`); a bare label still works.

## Auth & headless use

`login` and `setup` store credentials in `~/.novu/human.json`; `setup` reuses a saved login. Alternatively pass `setup --secret-key <key>` or set `NOVU_SECRET_KEY` (and optionally `NOVU_API_URL`) for an existing Novu environment. `NOVU_SECRET_KEY` takes priority over the saved login.

Without a login, `setup` creates a keyless environment: a free demo with a small message allowance. Run `human login` anytime to keep it; your channels and relay move into your Human account. Once the allowance is used up, the next command exits `1` and asks you to run `human login` instead of delivering the message (a sign-up link is also sent to you on your linked channel; if you use it, run `human login` afterwards).

In containers, sandboxes, and CI — anywhere no config file exists — the CLI is fully operational from environment variables alone:

```bash
docker run -e NOVU_SECRET_KEY=... -e HUMAN_TO=alice -e HUMAN_VIA=slack agent \
  npx @novu/human inbox approve "Deploy to prod?"
```

- `HUMAN_TO` — default recipient subscriberId(s), comma-separated like `--to` (max 50).
- `HUMAN_VIA` — default channel (`telegram`, `slack`, or `email`), like `--via`.

Precedence is always **CLI flags > environment variables > `~/.novu/human.json`**, and env values are never written back to the config file.

## Teaching your coding agent to use it

`setup` offers to install a skill (the [agentskills.io](https://agentskills.io) `SKILL.md` format) that teaches
Claude Code, Cursor, and other coding agents *when* to reach for `human` — background/autonomous runs, risky or
irreversible actions, genuine multi-way decisions — versus just asking you directly in an active chat. It
auto-detects which agents you have configured in the project (`.claude/`, `.cursor/`, etc.) and falls back to the
most common ones if none are detected.

```bash
human setup                      # offers to install the skill at the end (Y/n prompt)
human skill install               # install/reinstall explicitly, any time
human skill install --host claude cursor   # target specific hosts
```

Pass `--skill` / `--no-skill` to `human setup` to force the choice non-interactively.
