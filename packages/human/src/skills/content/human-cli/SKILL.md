---
name: human-cli
description: Reach the actual human you're working for via the `human` CLI (ask/approve/choose/tell) when you need a decision, approval, or notification and no one is watching this terminal right now. Use for background/autonomous/scheduled runs, risky or irreversible actions, and genuine multi-way ambiguity — not for routine questions the current chat user can just answer next turn.
triggers:
  - human ask
  - human approve
  - human cli
  - ask the human
  - need approval before deploying
  - notify when done
  - no one is watching this session
---

# The `human` CLI — reaching your human when you need one

`human` (package `@novu/human`) is a small CLI whose only job is getting a
real decision from a real person: `ask` a question, `approve` an action,
`choose` between options, or `tell` them something — over Telegram, Slack, or
email, wherever they set it up to reach them. Each blocking command waits
until they respond (or it times out) and then your process continues.

## When to reach for this vs. just asking in chat

If the person you're working for is actively watching this conversation and
can answer your next message, **just ask them normally** — don't shell out to
`human` for routine back-and-forth. Reach for `human` when:

- **You're running unattended** — a background task, a scheduled/cron job, an
  autonomous loop, a CI step, or any context where there's no live chat to
  post a question into and get an answer back.
- **The action is risky or irreversible** — deleting data, deploying to
  production, spending money, sending something externally-visible. Even in
  an interactive session, get an explicit `human approve` before doing these,
  so there's a real audit trail of who approved what and when.
- **There's a genuine multi-way decision** and guessing wrong is expensive —
  use `choose` instead of picking silently or asking a rhetorical question
  nobody will answer.
- **You finished something long-running and want to tell someone**, without
  blocking on a reply — use `tell`.

Don't use it as a crutch to avoid making reasonable calls you're equipped to
make yourself, and don't use it to relay simple status updates the calling
process/logs already surface.

## Before you rely on it: check it's set up

`human` needs one-time setup by the actual human (`npx @novu/human setup`).
If it isn't configured on this machine yet, every command exits 1 with:

```
No human connected yet. Ask your human to run: npx @novu/human setup (or set NOVU_SECRET_KEY + HUMAN_TO).
```

Treat that message as the actual next step: surface it to whoever *is*
reachable (chat, PR description, logs) rather than silently giving up or
looping. Never attempt to configure it on the human's behalf — you don't have
their Telegram/Slack/email credentials, and setup is interactive by design.

In sandboxes and containers with no config file, the CLI is fully operational
when `NOVU_SECRET_KEY` and `HUMAN_TO` are set in the environment
(optionally `HUMAN_VIA` for the channel). `--to`/`--via` flags still
override the env values.

To reach a *different* person than the one who ran setup, they need a linked
channel too:

```bash
human invite alice --via slack --name "Alice Chen"
human invite bob --via telegram --async --name "Bob"
human invite carol --via email --email carol@acme.com --name "Carol Diaz"
```

Send them the printed URL (Slack authorize or Telegram Start). `--async`
prints the URL and returns immediately. This does **not** change
`~/.novu/human.json`. After they connect, address them with `--to alice`.
`--name` is what `human contacts` shows next to the id, so always pass it
when you know who the person is.

## Who can I reach: check contacts before coordinating between people

When a task involves more than the one human who ran setup — routing a
question to the right owner, getting a second approval, telling someone
else a job finished — look before you ask:

```bash
human contacts --json
```

Each row is a subscriber the environment knows about: `id` (the subscriberId),
`firstName`/`lastName`, `email`, `phone`, free-form `data`, and `self: true`
on the person who ran setup (the default `--to` when you pass nothing).
Pick by name or id and pass the `id` to `--to`:

```bash
human approve "Ship the pricing change?" --to alice
human tell "Deploy is done." --to alice,bob
```

Contacts is a directory, not a reachability guarantee. If delivery fails with
"no linked <channel> endpoint", that person exists but hasn't connected the
channel yet — run `human invite <id> --via <channel> --name "…"`, send them
the URL, and retry. Never invent an id that isn't in the list, and
never page `self` as if they were a third party.

## The four commands

```bash
human ask "Which environment should I target: staging or prod?"
human approve "Delete 342 rows flagged as stale from the orders table?"
human choose "Pick a rollout strategy" --option canary --option "blue-green" --option "all at once"
human tell "Nightly build finished — 0 failures, deployed to staging."
```

- `ask` / `choose` return the human's answer as plain text on stdout.
- `approve` / `choose` deliver buttons; the human taps one.
- `choose` renders each option's full text in the message and labels the
  buttons themselves just A/B/C (chat button UIs, Telegram especially,
  truncate or wrap long button labels badly). Write full, descriptive
  `--option` values — don't shorten them to fit a button, that's handled for
  you. Cap it at 10 options (A–J); past that, ask a plain question instead.
- `tell` is one-way — it returns as soon as it's delivered, never blocks.

## Exit codes — branch on these, don't parse prose

| Code | Meaning |
|---|---|
| `0` | answered / approved / chosen / delivered |
| `10` | denied |
| `11` | timed out waiting — still pending, resumable |
| `12` | expired or canceled |
| `1` | error (not set up, bad input, network) |

```bash
if human approve "Deploy to production?"; then
  echo "approved, proceeding"
else
  code=$?
  if [ "$code" -eq 10 ]; then echo "denied, stopping"; exit 1; fi
  if [ "$code" -eq 11 ]; then echo "no answer yet, will resume: human wait <id>"; fi
fi
```

Add `--json` to any command to get the full interaction object (id, status,
response, timestamps) instead of prose — parse that when you need structured
data rather than scraping stdout text.

## Waiting behavior

Commands block by default and print a live spinner (on stderr, so stdout stays
clean for scripts) until the human answers. Two flags change that:

- `--timeout 10m` — give up waiting after this long. On timeout the command
  prints the interaction id and exits `11`; resume later with
  `human wait <id>`.
- `--async` — don't block at all; print the id immediately and check back
  with `human wait <id>` or `human list`.

Use `--timeout` for anything inside a larger workflow that shouldn't hang
forever waiting on a human who might be asleep; use `--async` when you have
other useful work to do while you wait.

## Useful flags

- `--from "deploy-bot"` — label shown to the human so they know which agent
  is asking. Set this whenever you have a stable identity (skip it for
  one-off ad hoc runs).
- `--to <humanId>` / `--via <telegram|slack|email>` — `--to` addresses humans
  who are already linked. Find them with `human contacts --json` first; link
  someone new with `human invite alice --via slack --name "Alice Chen"`
  (prints a connect URL for them; does not change your local identity). `--to alice,bob` lets any listed human settle
  (first valid answer wins, max 50). `--via` on ask/approve is only a delivery
  override when that person has several channels; don't guess — if you need
  a specific one, pass `--via`. If they have no endpoint yet, the API tells
  you to run `human invite <id> --via <channel>`.
- `--ttl 2h` — how long the request stays answerable before it expires
  (default 24h, max 72h). Shorten this for anything time-sensitive so a
  stale approval can't be actioned days later.

## Checking in without asking something new

- `human list` — see pending/recent interactions (useful before creating a
  duplicate ask).
- `human wait <id>` — resume blocking on something you created with
  `--async` or that previously timed out.
- `human cancel <id>` — withdraw a pending request you no longer need
  answered (e.g. you found another way forward).
