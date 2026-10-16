---
name: verify-in-box
description: Verify a change end to end on the Novu Box, a full Novu Cloud stack in one container. Use when a change to apps/, libs/, packages/, enterprise/ or playground/ needs proof that it works, or when asked to check, verify, demo or reproduce something on the box.
---

# Verify in the box

The box runs the whole Novu Cloud stack (API, worker, socket, dashboard, the bridge app, every database) with your
checkout on it. `docker/box/README.md` is the reference for every command, URL and credential named here.

Run each step from the repo root. A step is done when its check passes; the evidence it names goes in your report.

## 1. Launch

```sh
node docker/box/cli.mjs up
node docker/box/cli.mjs sync
```

Done when `sync` exits 0 and ends with `applied sync <branch> at <sha>`. Keep its `plan:` line: it says what the box
rebuilt and restarted, which is part of the evidence.

- `up` on a box with no data bakes `next` first (about 12 minutes); on an existing box it takes seconds.
- `sync` sends new files only inside the repo's existing top-level folders. A new file at the root or in a new
  top-level folder isn't sent; commit it or move it if the box needs it.
- `sync` stops over 25 MB and names the biggest changed files. Ask the user before deleting or ignoring any of them.
- A conflict with the box's baked commit stops `sync` before it touches the box. Merge or rebase onto `next`, then
  sync again.

## 2. Doctor

```sh
node docker/box/cli.mjs doctor
```

Done when it prints `"ok": true`. Otherwise read `problems`, then `node docker/box/cli.mjs logs <process>` for the
process named. An unfinished apply is fixed by syncing again. `logs --errors` (no process) shows the warnings and
errors of every process; `logs --follow` streams them while you drive the change.

## 3. Drive

Exercise the change the way a user reaches it, on the path the change touches:

- **API or worker:** call `http://localhost:13000`. The Development environment's secret key is
  `node docker/box/cli.mjs exec -- cat /data/bridge/secret-key`; send it as `Authorization: ApiKey <key>`.
- **Dashboard:** open `http://localhost:14200` in a browser and sign in with the seed user from the README.
- **Email, SMS, push, chat:** trigger the workflow, then read Mailpit at `http://localhost:18025/mail`; the sink delivers
  the SMS, push and chat messages there too.
- **Bridge workflows and agents:** they live in `playground/nextjs`; the box syncs them on every apply that changes
  the framework or the playground.
- **Broad changes** (shared libraries, auth, queues): also run the smoke test from the README (about 2 minutes).

Done when the changed behaviour is observed working, and the behaviour beside it still works. One happy path is a
_tracer_, not proof: drive at least one failure case the change handles.

The box skips type checks, so it runs code CI would reject. Run the affected project's typecheck as well.

## 4. Evidence

Report, for the user to reproduce:

1. The `plan:` and `applied` lines from `sync`.
2. The `doctor` result.
3. Each check from Drive: the exact command or page, and what came back (status, response body, a screenshot path).
4. The smoke test's `smoke.json` path and pass count, if you ran it.

## 5. Cleanup

Leave the box running while the user may still look at it. When the work is done, `node docker/box/cli.mjs down`
frees about 3 GB; the data stays for the next `up`.

Ask the user before removing a box container or volume.
