# Digest Step

Digest step to batch multiple notifications. **Place BEFORE channel steps.**

## Digest Types

- **`regular`** (default):
  - With a **look-back window** — digest only if a recent message was sent.
  - Without a look-back window — groups all events that arrive within the time window.
- **`timed`** — with a cron expression, collects events until the scheduled time (UTC).

## Common Patterns

- Pass the first event immediately, digest the rest.
- Batch activity updates hourly.
- Group by key (e.g. `payload.projectId`) for per-project digests.

## Accessing Digested Events Downstream

Steps **after** a digest step can reference:

- `steps.<digest-step-id>.events` — the array of digested events (use with a `repeat` node in Block Editor or a `{% for %}` loop in HTML).
- `steps.<digest-step-id>.eventCount` — the number of digested events.

See [`email-step.md`](./email-step.md) for the Block Editor `repeat` + `current.payload.*` pattern.

## See Also

- [`design-workflow/references/digest-defaults.md`](../../design-workflow/references/digest-defaults.md) — default windows, digest key composition, when to skip the digest
- [`email-step.md`](./email-step.md) — Block Editor digest variables (`current.payload.*` + `aliasFor`)
- [`step-conditions.md`](./step-conditions.md) — gate steps on `eventCount` (e.g. only send a summary email when more than N events)
