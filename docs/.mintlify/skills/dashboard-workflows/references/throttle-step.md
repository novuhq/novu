# Throttle Step

Throttle step to limit notification frequency and prevent fatigue.

## Common Patterns

- Max **3 per hour** per user.
- Max **1 per day** for marketing.
- Throttle by key (e.g. `payload.alertType`) for grouped limits.

## See Also

- [`digest-step.md`](./digest-step.md) — use a digest when the goal is to **batch** events into one message; use throttle when the goal is to **drop** excess messages
- [`step-conditions.md`](./step-conditions.md) — combine throttle with conditions for finer routing
