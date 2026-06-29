---
name: novu-dashboard-workflows
description: Author step content for Novu workflows defined in the Dashboard or generated/edited via the Novu MCP. Use when filling in step controls (subject, body, editorType, headers, body, conditions) for email, in-app, sms, push, chat, delay, digest, throttle, or HTTP Request steps.
inputs:
  - name: NOVU_SECRET_KEY
    description: "Server-side API key from https://dashboard.novu.co/api-keys. Used by the Novu MCP and Dashboard automation."
    required: true
    type: secret
---

# Dashboard Workflows

Rules for authoring **step content** (subject, body, `editorType`, headers, body, conditions) on workflows that live in the Novu Dashboard — whether you're editing them by hand or via the Novu MCP.

> Authoring **in code** with [`@novu/framework`](../framework-integration)? Skip this skill — the Framework SDK encodes these constraints in its types and helpers.
>
> Still need to **decide** what the workflow should look like (channels, severity, critical, digest, templates)? Start with [`design-workflow/`](../design-workflow), then come back here to fill in the step content.

## When to use this skill

Use it whenever you write or edit the **controls** of a Dashboard / MCP step:

- "Set the email subject and body for this step"
- "Update the in-app notification copy"
- "Add headers to this HTTP Request step"
- "Change the digest window to 1 hour"
- "Skip this step when the subscriber is offline" (step condition)
- Any Novu MCP tool call that writes step content (`create_workflow`, `update_workflow_step`, etc.)

## Step Content Guidelines

These rules apply to **every** step type.

- Use Liquid variables in control values for personalization. Variables must be wrapped in double curly braces `{{` and `}}`. Example: `{{ subscriber.firstName }}`, `{{ payload.* }}`.
- **EXCEPTION:** In Block Editor (`editorType: "block"`) node attributes, never use curly braces — use bare variable names like `payload.actionUrl` instead of `{{ payload.actionUrl }}`. See [`references/email-step.md`](./references/email-step.md) for the full Block Editor rules.
- For steps **after** an HTTP Request step, use `{{ steps.<http-step-id>.<property> }}` to reference response data. Only properties defined in that HTTP step's `responseBodySchema` are available — never invent arbitrary response fields. Example: if HTTP step `fetch-user` defines `responseBodySchema` with `name` and `email`, use `{{ steps.fetch-user.name }}` and `{{ steps.fetch-user.email }}`.
- Never hardcode URLs, names, or product names — use variables instead.
- Keep content consistent with other workflow steps.
- Modify the content according to the user's intent.
- Preserve everything not explicitly asked to change.
- Keep the same `editorType` (`block` or `html` for email) and structure.

## Step Types

Each step type has its own content rules. Open the matching reference before writing controls.

| Step type      | Reference                                                       | Use it for                                                  |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Email          | [`references/email-step.md`](./references/email-step.md)         | Detailed content, formal communications, receipts           |
| In-App         | [`references/in-app-step.md`](./references/in-app-step.md)       | Real-time updates, activity feeds, high engagement          |
| SMS            | [`references/sms-step.md`](./references/sms-step.md)             | Urgent alerts, verification codes, time-sensitive messages  |
| Push           | [`references/push-step.md`](./references/push-step.md)           | Mobile engagement, re-engagement, time-sensitive updates    |
| Chat           | [`references/chat-step.md`](./references/chat-step.md)           | Slack / Discord / Teams team & developer alerts             |
| Delay          | [`references/delay-step.md`](./references/delay-step.md)         | Pause workflow execution before a channel step              |
| Digest         | [`references/digest-step.md`](./references/digest-step.md)       | Batch multiple notifications into one                       |
| Throttle       | [`references/throttle-step.md`](./references/throttle-step.md)   | Limit notification frequency, prevent fatigue               |
| HTTP Request   | [`references/http-request-step.md`](./references/http-request-step.md) | Call external APIs / webhooks; fetch data for later steps   |
| Step condition | [`references/step-conditions.md`](./references/step-conditions.md) | JSON-Logic for "send only if…", merge / replace / remove    |

## Common Pitfalls

1. **Curly braces inside Block Editor attributes** — Maily TipTap node attrs (`url`, `text`, `src`, `id`, `each`, `href`, `externalLink`) take **bare** variable names. `"{{ payload.actionUrl }}"` is wrong; `"payload.actionUrl"` is right. See [`references/email-step.md`](./references/email-step.md).
2. **Referencing undeclared HTTP response fields** — `{{ steps.<http-step-id>.<property> }}` only works for properties listed in that step's `responseBodySchema`. Add the property to the schema first.
3. **Hardcoding array items instead of looping** — when the payload contains an array (`payload.items`, `payload.providers`), iterate with a Block Editor `repeat` node or an HTML `{% for %}` loop. Don't list array items as separate nodes / elements.
4. **Empty key/value entries in HTTP headers or body** — use an empty array `[]` when not needed. Never `[{ "key": "", "value": "" }]`.
5. **Hardcoded URLs / product names** — always pull from `payload.*` or `subscriber.*` so the workflow stays portable.
6. **Changing `editorType` when editing email** — keep `block` as `block` and `html` as `html` unless the user explicitly asks to switch.
7. **Replacing a step condition when the user said "add"** — "add" / "also" / "and" merges with `{ "and": [...] }`; "change to" / "set to" replaces; "remove" / "clear" returns `null`. See [`references/step-conditions.md`](./references/step-conditions.md).

## See Also

- [`design-workflow/`](../design-workflow) — choose channels, severity, `critical`, digest defaults, and pick a workflow template **before** authoring step content
- [`framework-integration/`](../framework-integration) — author the same workflows in code with `@novu/framework` instead
- [`trigger-notification/`](../trigger-notification) — fire a workflow once it's authored
