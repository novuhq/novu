# In-App Step

In-app notification for real-time updates, activity feeds, high engagement.

## Guidelines

- Include action buttons for engagement.
- Focus on a **single action or piece of information**.
- Can be longer than push notifications — but stay scannable.

## Variables

Use Liquid syntax for personalization in subject / body / action labels:

- `{{ subscriber.firstName }}`
- `{{ payload.* }}`
- `{{ steps.<http-step-id>.<property> }}` — only when the upstream HTTP step declares the property in its `responseBodySchema`

## See Also

- [`step-conditions.md`](./step-conditions.md) — gate the In-App step (rarely needed; In-App is usually the primary channel)
- [`design-workflow/references/channel-selection.md`](../../design-workflow/references/channel-selection.md) — when In-App is the right default
- [`inbox-integration/SKILL.md`](../../inbox-integration/SKILL.md) — how In-App notifications surface in the recipient app
