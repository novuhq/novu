# Digest Defaults

Defaults for the `digest` step in any workflow. Applies to both Dashboard digest and Framework `step.digest`.

## Default Configuration

| Field             | Default            |
| ----------------- | ------------------ |
| Type              | `regular`          |
| Look-back window  | **5 minutes**      |
| Digest time       | **1 hour**         |
| Digest key        | `subscriberId`     |

A `regular` digest collects events that arrive within the look-back window after the first trigger, then waits the digest time before sending the aggregated notification. With the defaults, the first trigger waits up to 1 hour, scooping up any matching trigger that lands within 5 minutes of one another.

## Skip the Digest When

- `severity: HIGH`, or
- `critical: true`

Critical and very-high-severity workflows must deliver immediately. The digest step is auto-skipped in those cases.

## Digest Key Composition

The digest key controls **what counts as the same digest**. Default is `subscriberId` so each user gets their own digest. Add more parts to the key for finer grouping:

| Pattern                            | Use case                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `subscriberId`                     | One digest per recipient (default)                                                             |
| `subscriberId + threadId`          | Conversational flows — one digest per thread/post (comments, replies, mentions)                |
| `subscriberId + projectId`         | Per-project activity feeds                                                                     |
| `subscriberId + organizationId`    | Multi-tenant per-org digests                                                                   |

> Without `+threadId`, a comment on Post A and a comment on Post B end up in the same digest. The user sees "5 new comments" instead of "2 new comments on Post A, 3 on Post B".

## Conversational Digest Example

For a "comment on your post" workflow:

```
Trigger (event: payload.threadId: "post_123")
  ↓
Digest: type "regular", look-back 5min, digest time 1h
  Key: subscriberId + threadId
  ↓
In-App
  Redirect: → thread
```

Each thread gets its own digest. Comments on Post 123 don't mix with comments on Post 456.

## When NOT to Add a Digest

- Single-event flows (order confirmation for one order, password reset for one request).
- `critical: true` workflows (digest is bypassed anyway).
- High-severity alerts (`severity > HIGH`).
- User-specified channel-only flows where the user didn't ask for batching.

## When TO Add a Digest

- High-frequency conversational events (comments, mentions, reactions, follows).
- Activity feeds ("5 new updates in your project").
- Lifecycle nudges that may fire many times in a short window.

## Cron-Based Digests

Use a cron expression instead of `look-back + digest time` for fixed-schedule digests (e.g. "every weekday at 9 AM"):

- Dashboard: switch the digest type to `cron` and provide a cron string.
- Framework: pass `cron: "0 9 * * 1-5"` to `step.digest` instead of `unit`/`amount`.

See [`framework-integration/references/workflow-and-steps.md`](../../framework-integration/references/workflow-and-steps.md#stepdigest) for the Framework signature.

## Common Pitfalls

1. **Forgetting `+threadId` for conversational flows** — comments on different posts collapse into one digest.
2. **Adding a digest to a `critical` workflow** — it's auto-skipped, but it's a code smell that hides intent.
3. **Two digest steps in one workflow** — not supported. Chain workflows with a custom step (Framework) or a second workflow trigger.
4. **Very long look-back windows** — digest delivery feels delayed. Keep look-back ≤ digest time.

## See Also

- [`severity-and-critical.md`](./severity-and-critical.md) — when digest is auto-skipped
- [`workflow-templates.md`](./workflow-templates.md) — templates 1 and 2 illustrate the standard digest pattern
- [`framework-integration/references/workflow-and-steps.md`](../../framework-integration/references/workflow-and-steps.md) — Framework `step.digest` reference
