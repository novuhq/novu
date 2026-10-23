---
name: verify-in-box
description: Verify a change end to end on the Novu Box, a full Novu Cloud stack in one container on Cloudflare. Use when a change to apps/, libs/, packages/, enterprise/ or playground/ needs proof that it works, or when asked to check, verify, demo or reproduce something on the box.
---

# Verify in the box

The box runs the whole Novu Cloud stack on Cloudflare (API, worker, socket, dashboard, the bridge app, every
database, enterprise code, every channel, agents, Slack), with your checkout on it. Use it to prove behaviour; check
type errors and unit-level logic locally.

Commands below are `node docker/box/src/cli/main.ts <command>`, run from the repo root. Every command takes
`--box <name>` (default: your branch's box); `--help` lists every command and flag, and `docker/box/README.md` is the
reference for every command, URL and credential. The CLI needs `gh` signed in as someone with push access to
`novuhq/novu`; in Cursor Cloud it uses the `CURSOR_BOX_TOKEN` secret by itself. No secrets on your machine.

```sh
node docker/box/src/cli/main.ts --help          # the reference for every command and flag
node docker/box/src/cli/main.ts up              # start your branch's box with your checkout
node docker/box/src/cli/main.ts sync            # put your latest changes on it
node docker/box/src/cli/main.ts doctor          # is it fit to test on
node docker/box/src/cli/main.ts user seed       # a one-time sign-in link for the seeded org
node docker/box/src/cli/main.ts user create     # a dashboard account for this box only
node docker/box/src/cli/main.ts mail            # what it sent: email, SMS, push, chat
node docker/box/src/cli/main.ts logs --errors   # what went wrong
```

A step is done when its check passes; what it proves goes in your report.

## 1. Launch

```sh
npm ci --prefix docker/box   # once per checkout, and after docker/box/package-lock.json changes
node docker/box/src/cli/main.ts up
node docker/box/src/cli/main.ts sync
```

Done when `sync` exits 0 and ends with `applied sync <branch> at <sha>`. Keep that line and its `plan:` line (what the
box rebuilt and restarted) for your report: a proof against a stale apply isn't proof.

- `up` is your branch's box, shared by everyone on the branch: a new one starts from `base` in a few minutes with
  your checkout, and an asleep one wakes in under a minute. Without a `base` snapshot it bakes `next` first (about
  15 minutes).
- When agents work in parallel, give each its own `--box <name>` on every command, and never drive a box you didn't
  start. Start it with `up --box <name> --from base`, then `sync --box <name>`: without `--from base` a new named box
  bakes `next`, and `up --box` doesn't put your checkout on it.
- `up` prints the dashboard's address, `https://<box>.box.novu-staging.co` (`<box>` below), with Mailpit under
  `/mail`, and the API's, `https://<box>-api.box.novu-staging.co`.
- `sync` sends new files only inside the repo's existing top-level folders. A new file at the root or in a new
  top-level folder isn't sent; commit it or move it if the box needs it.
- `sync` stops over 25 MB and names the biggest changed files. Ask the user before deleting or ignoring any of them.
- A conflict with the box's baked commit stops `sync` before it touches the box. Merge or rebase onto `next`, then
  sync again.

## 2. Doctor

Run `doctor`. Done when it prints `"ok": true`. Otherwise read `problems`, then `logs <process>` for the process
named; an unfinished apply is fixed by syncing again. `logs --errors` shows the warnings and errors of every process,
and `logs --follow` streams them while you drive.

## 3. Drive

Exercise the change the way a user reaches it (the dashboard, the public API), not through internal calls:

- **API or worker:** call `<box>/v1/...` with `Authorization: ApiKey <key>`, where the key is the Development
  environment's secret key from `exec -- cat /data/bridge/secret-key`.
- **Dashboard:** open `<box>` in a browser and sign in (Accounts below).
- **Email, SMS, push, chat:** every email lands in the box's Mailpit, and the sink puts SMS, push and chat messages
  there too. Trigger the workflow, then:
  1. `mail to:<recipient>` (or `subject:<text>`, `tag:sms`; no argument lists the newest). Done when the message is
     listed; if it isn't, `logs --errors` says why.
  2. `mail <id>`: check the headers, the text and the links against what the change should send, and read the
     `html check`: it names the CSS and HTML features that break in which email clients. `--html` prints the
     source; `--check-links` requests every link (only when the links are safe to request).
  3. For a template change, open the `view` URL it prints in a browser and screenshot it at 600 px and 375 px wide.
- **Bridge workflows and agents:** sign in as the seed user; change them in `playground/nextjs`, and `sync` rebuilds
  them.
- **Broad changes** (shared libraries, auth, queues): also drive the main flows the change could break (sign-in,
  trigger a workflow and check the message, an agent reply).

Done when the changed behaviour is observed working, and the behaviour beside it still works. One happy path is a
_tracer_, not proof: drive at least one failure case the change handles.

The box skips type checks, so it runs code CI would reject. Run the affected project's typecheck as well.

### Accounts

**The seed user** `agent@novu.co` is the fast path: `user seed` prints a link that signs the browser in as it, once,
within 10 minutes; run it again for a new one. Its org has the Team plan, email to Mailpit and SMS, push and chat to
the sink, and in Development the bridge app's workflows, its code-first agents and a managed agent, on web chat and
on Slack in `#novu-box`. A test user's org gets none of the bridge app, its agents or Slack.

The seed user is one account in every box: change what you test inside the box, never its password, email, sign-in
settings, or its org's name or members.

**A test user**, for a new org, a real onboarding, or several users: `user create` makes one for the box and prints
its email and password; never reuse it in another box. Sign in and finish the onboarding, and Novu creates the
user's own org and environments, as for a real sign-up. Then, if needed:

- `user channels <email>`: its org's email to Mailpit and its SMS, push and chat to the sink (a new org sends only
  in-app messages).
- `user team <email>`: its org on the Team plan.
- `user delete <email>` when you're done; deleting the box deletes its users.

## 4. Proof bar

- Capture the trigger and the resulting state, and verify the side effect (the `mail` entry, an API read-back of
  what was stored), not only the UI.
- You own the proof: attach it to the PR (its description or a comment), or to your reply when there's no PR, with
  the box address, the applied commit, and each command or page that made it. For a UI change attach screenshots,
  or a video for a flow with several steps.
- Never paste a password, sign-in link or secret key into a PR, chat or log, and keep them out of screenshots and
  videos: PR attachments are public.

## 5. Cleanup

Leave the box running while the user may still look at it; it saves itself and sleeps after an hour without
requests, and wakes on the next one. `down` puts it to sleep now; the data stays for the next `up`.

Ask the user before `delete`, which deletes the box with its data.
