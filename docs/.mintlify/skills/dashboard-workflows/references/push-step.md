# Push Step

Push notification for mobile engagement, re-engagement, time-sensitive updates.

## Guidelines

- **Title** (`subject`) must be **under 50 characters**.
- **Body** must be **under 150 characters**.
- Action-oriented; **front-load the important info**.

## Variables

Use Liquid syntax in `subject` and `body`:

- `{{ subscriber.firstName }}`
- `{{ payload.* }}`
- `{{ steps.<http-step-id>.<property> }}` — only when the upstream HTTP step declares the property in its `responseBodySchema`

## Common Pattern

Pair Push with a step condition so it only fires when the recipient is offline (otherwise the In-App alert already covers it):

```json
{ "==": [{ "var": "subscriber.isOnline" }, "false"] }
```

See [`step-conditions.md`](./step-conditions.md).

## See Also

- [`step-conditions.md`](./step-conditions.md) — the canonical "subscriber offline" condition for Push
- [`design-workflow/references/channel-selection.md`](../../design-workflow/references/channel-selection.md) — when Push is the right channel
