# SMS Step

SMS step for urgent alerts, verification codes, time-sensitive messages.

## Guidelines

- `body` must be **under 160 characters** to avoid message splitting.
- Direct and actionable — essential info only.
- Avoid special characters and unnecessary URLs.

## Variables

Use Liquid syntax in `body`:

- `{{ subscriber.firstName }}`
- `{{ payload.* }}`
- `{{ steps.<http-step-id>.<property> }}` — only when the upstream HTTP step declares the property in its `responseBodySchema`

## See Also

- [`step-conditions.md`](./step-conditions.md) — common pattern: SMS only when `critical: true` or other channels failed
- [`design-workflow/references/channel-selection.md`](../../design-workflow/references/channel-selection.md) — SMS is a last resort: OTP, regulatory, true emergencies
