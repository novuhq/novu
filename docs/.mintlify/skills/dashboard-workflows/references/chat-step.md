# Chat Step

Chat step for Slack / Discord / Teams — team notifications, developer alerts.

## Guidelines

- **Conversational tone** with standalone context (the recipient sees the message outside your product UI).
- **Markdown is supported** on most platforms (bold, links, code, lists).

## Variables

Use Liquid syntax in `body`:

- `{{ subscriber.firstName }}`
- `{{ payload.* }}`
- `{{ steps.<http-step-id>.<property> }}` — only when the upstream HTTP step declares the property in its `responseBodySchema`

## See Also

- [`step-conditions.md`](./step-conditions.md) — gate Chat on workflow tags or severity
- [`design-workflow/references/channel-selection.md`](../../design-workflow/references/channel-selection.md) — Chat is a fit when configured **and** `severity >= MEDIUM`
