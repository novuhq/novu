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

The no-account (keyless) setup is a free demo with a small message allowance.
When it runs out, commands exit 1 with:

```
You've used the 5 free messages of this keyless demo.
To keep your channels and continue, run: human login
(Or sign up from this link, which we also sent to your linked channel, then run `human login`: https://gethuman.md/claim?token=...)
```

Stop retrying, surface the message where the human will see it, and wait. The
human runs `human login` themselves: it signs them in (or up) on gethuman.md in
the browser and keeps their channels. Don't run it for them.

In sandboxes and containers with no config file, the CLI is fully operational
when `NOVU_SECRET_KEY` and `HUMAN_TO` are set in the environment
(optionally `HUMAN_VIA` for the channel). `--to`/`--via` flags still
override the env values.

To reach a *different* person than the one who ran setup, they need a linked
channel too:

```bash
human invite alice --name "Alice Chen"                 # they pick on a page
human invite bob --via telegram --async --name "Bob"   # one specific channel
human invite carol --via email --email carol@acme.com --name "Carol Diaz"
```

Prefer plain `human invite <id>`: it prints a link (valid for 3 days) to a
Novu page where they connect any channel you set up — Telegram, Slack, or
both — and pick their default. Use `--via <channel>` only when you know the
one channel they use: it prints that channel's direct connect link instead
(Slack authorize or Telegram Start, valid for minutes) and makes it their
default. Nothing is sent for you — share the link with them, or give it to
your human to forward. `--async` prints the link and returns immediately.
This does **not** change `~/.novu/human.json`. After they connect, address
them with `--to alice`; messages go to their default channel unless you pass
`--via`. `--name` is what `human contacts` shows next to the id, so always
pass it when you know who the person is.

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
Pages are 50 rows by default; when `next` is non-null, fetch the rest with
`human contacts --after <next>` before concluding someone isn't there.
Pick by name or id and pass the `id` to `--to`:

```bash
human approve "Ship the pricing change?" --to alice
human tell "Deploy is done." --to alice,bob
```

Contacts is a directory, not a reachability guarantee. If delivery fails with
"no linked <channel> endpoint", that person exists but hasn't connected the
channel yet — run `human invite <id> --name "…"` (add `--via <channel>` only
if it must be that channel), share the link, and retry once they connect. Never invent an id that isn't in the list, and
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
  someone new with `human invite alice --name "Alice Chen"` (prints a link
  where they pick a channel; does not change your local identity). `--to alice,bob` lets any listed human settle
  (first valid answer wins, max 50). `--via` on ask/approve is only a
  per-call delivery override; without it each human gets their own default
  channel (`HUMAN_VIA` goes with the `HUMAN_TO` default recipients, and
  `human channels --default` only applies when messaging yourself). If they
  have no endpoint yet, the API error names the
  `human invite` command to run.
- `--ttl 2h` — how long the request stays answerable before it expires
  (default 24h, max 72h). Shorten this for anything time-sensitive so a
  stale approval can't be actioned days later.
- `--icon` — Slack only; MCP catalog id (`stripe`, `github`) or https URL (32×32). Ignored on other channels.
- `--subtitle`, `--body` — optional card chrome on every channel.
- Approve only: `--approve-label`, `--deny-label`, repeatable
  `--extra-action trust-tool:"Always allow this tool"`.
- Choose `--option` also accepts `id:label` (`--option stg:Staging`).

```bash
human approve "Should we deploy to staging?" \
  --icon stripe \
  --subtitle "issue_refund: ORD-42" \
  --body "Refund $25.00" \
  --extra-action trust-tool:"Always allow this tool"

human choose "Which environment?" \
  --option stg:Staging \
  --option prd:Production \
  --subtitle "This cannot be undone"
```

## The inbox: messages humans send you first

Your contacts can also message you without being asked — on Telegram, Slack, or
email, whatever they connected. Each conversation is one inbox thread, tagged
with the `channel` it came from. Nothing is lost while you're not looking: a
message that doesn't answer a pending ask/approve/choose stays unread in the
inbox, and they get no automatic reply.

The loop for an unattended agent:

```bash
human inbox unread --wait 25 --json   # block up to 25s for unread threads
human inbox show conv_123 --json      # full thread, oldest first; marks it read
human inbox reply conv_123 "On it — deploying now."
human inbox resolve conv_123          # done; a new message from them reopens it
```

- `human inbox unread --wait <duration> --json` returns `{ data, next }`. Each
  thread has `id`, `channel`, `from` (`subscriberId`, `name`), `unreadCount`,
  `lastMessage` (`text`, `at`, `from`: `human` | `agent`) and `status`. With
  `--wait` and nothing arriving, it prints an empty page and exits `11`, so
  you can loop on it. `--wait` alone waits forever.
- `human inbox` (no subcommand) lists every open thread; add `--all` to include
  resolved ones. Pages are 20 threads by default. When `next` is non-null,
  pass `--after <next>`.
- `human inbox show <id>` returns `{ thread, messages, hasMore }`. Each
  message has `from` (`human` | `agent` | `system`), `text`, `at`, and
  `interaction` (`id`, `kind`, `status`) on ask/approve cards. When `hasMore`
  is true, page back with `--before <messages[0].id>`. Showing a thread
  marks it read. Use `human inbox read <id>` to do that without fetching it.
- `human inbox reply <id> "<text>"` posts plain markdown on the thread's own
  channel and marks it read.
- `human inbox ask|approve|choose|tell <id> "<prompt>"` posts the same cards
  as the top-level commands, but inside that thread instead of a new DM.
  They take the same card flags, `--from`, `--ttl`, `--timeout`, `--async`
  and `--json`, but no `--to`/`--via`: the thread decides who and where. Exit
  codes match the table above.
- When the human taps a button or types an answer that settles a card, it
  doesn't show up as unread. The blocking command (or `human wait <id>`)
  already gives you that answer. It still appears in `show` history.

Only reply when you have something to say: there is no auto-acknowledgement,
so a thread you `read` and leave sits silent on their side. Resolve threads
you've finished with so `human inbox` stays a to-do list.

## Checking in without asking something new

- `human list` — see pending/recent interactions (useful before creating a
  duplicate ask).
- `human wait <id>` — resume blocking on something you created with
  `--async` or that previously timed out.
- `human cancel <id>` — withdraw a pending request you no longer need
  answered (e.g. you found another way forward).
