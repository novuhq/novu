# Delay Step

Delay step to pause workflow execution. **Place BEFORE channel steps.**

## Common Patterns

- **1–2 hours** before reminders.
- **24 hours** before follow-up emails.
- **5–10 minutes** between push and email for urgent notifications.

## See Also

- [`step-conditions.md`](./step-conditions.md) — common pattern: skip a delay (and the steps after it) when an earlier In-App was already read
- [`digest-step.md`](./digest-step.md) — when batching is the right tool instead of a fixed delay
