# @novu/human

**The human API for agents.** Agents are connected to everything — except the humans they work for. `human` gives any agent a one-line way to reach a real person on Telegram (Slack coming next) and block until they answer.

```bash
# One-time, by the human (interactive picker, or name the channel):
npx @novu/human setup
npx @novu/human setup telegram
npx @novu/human setup slack
npx @novu/human setup email

# Forever after, by any agent on the machine:
human ask "Which environment should I deploy to?"
human approve "Delete 342 stale records from prod?"
human choose "Pick a release strategy" --option canary --option blue-green
human tell "Nightly build finished — 0 failures."

# Link another human (they open the URL; does not change your local identity):
human invite alice --via slack --name "Alice Chen"
human invite bob --via telegram --async
human invite carol --via email --email carol@acme.com

# See who agents can reach (subscribers in the environment; `(you)` marks the operator):
human contacts
human contacts --json
```

## How it works

- `setup` provisions a keyless Novu environment (no account needed), a hidden relay agent, and links **your** channel — Telegram via QR, Slack via app install, Email by registering your address (approvals arrive as button emails; answer asks by replying). Run it again with another channel to add more. Linked channels live on the server; `human channels --default slack` sets a local preference for where interactions land when you don't pass `--via`.
- `invite` links a **different** subscriber the same way Slack/Telegram connect does (OAuth or a deep link → channel endpoint). Send them the URL; your `~/.novu/human.json` subscriberId stays yours. Then `--to alice` can reach them. Pass `--name "Alice Chen"` so they show up by name.
- `contacts` lists the environment's subscribers — every person `--to` can address — so an agent can check who exists before coordinating between people. It's a directory, not a reachability check: if delivery fails with "no linked endpoint", `invite` them on that channel.
- Agents stay channel-blind: routing is the human's preference. `--via telegram|slack|email` on ask/approve is a rare per-call **delivery** override, not how you onboard someone.
- Each command delivers a one-off message (with action buttons where relevant) and **blocks** until the human answers, the `--ttl` expires, or `--timeout` elapses.
- Answers flow back through button clicks or plain replies; the CLI resolves and your agent continues.

## Exit codes (stable contract for agents)

| Code | Meaning |
| ---- | ------- |
| `0`  | answered / approved / chosen / delivered |
| `10` | denied |
| `11` | timed out waiting — still pending, resume with `human wait <id>` |
| `12` | expired or canceled |
| `1`  | error |

## Useful flags

- `--from deploy-bot` — attribution shown to the human ("Requested by deploy-bot").
- `--ttl 2h` — how long the request stays answerable (default 24h, max 72h).
- `--timeout 10m` — max time this invocation blocks; on timeout it prints the id so `human wait <id>` can resume.
- `--async` — don't block; print the interaction id immediately.
- `--json` — full interaction object for programmatic parsing.
- `--to <humanId>` — address a human who is already linked (`human contacts` to find them, `human invite` to add them), or comma-separated humans (`alice,bob`, max 50) so any listed person can settle.
- `--via <platform>` — deliver on a specific linked channel instead of the default.

## Auth & headless use

`setup` stores credentials in `~/.novu/human.json`. Alternatively set `NOVU_SECRET_KEY` (and optionally `NOVU_API_URL`) for an existing Novu environment.

The keyless environment `setup` creates is a free demo with a small message allowance. Once it's used up, the next command exits `1` with a sign-up link (the same link is sent to you on your linked channel) instead of delivering the message. Sign up and claim the demo; your channels and relay move into your Development environment. Then run `human auth` to sign in through the dashboard and securely save the Development key while keeping your existing recipient and channel preferences.

If `NOVU_SECRET_KEY` is already set, `human auth` uses that environment credential precedence and leaves `human.json` unchanged.

In containers, sandboxes, and CI — anywhere no config file exists — the CLI is fully operational from environment variables alone:

```bash
docker run -e NOVU_SECRET_KEY=... -e HUMAN_TO=alice -e HUMAN_VIA=slack agent \
  npx @novu/human approve "Deploy to prod?"
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
