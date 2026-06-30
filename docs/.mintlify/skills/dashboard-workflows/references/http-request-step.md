# HTTP Request Step

HTTP Request step to call an external API, send a webhook, or fetch data from a third-party service.

This is an **action step** — it does **not** send a notification to the subscriber. Use it when the workflow needs to integrate with external systems.

## Required Fields

| Field    | Description                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `method` | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`                                           |
| `url`    | Absolute URL or a template variable. Examples: `"https://api.example.com/notify"`, `"{{payload.webhookUrl}}"`     |

## Optional Fields

| Field                     | Description                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `headers`                 | Key-value pairs for request headers. Always include `Content-Type` when sending a body.                                                                |
| `body`                    | Key-value pairs for the request body (only applicable for `POST`, `PUT`, `PATCH`).                                                                     |
| `responseBodySchema`      | JSON Schema object (`type`, `properties`, `required`) describing the expected response shape. Defines which response fields are available downstream.  |
| `enforceSchemaValidation` | Set `true` only when validating the response against `responseBodySchema`.                                                                             |
| `continueOnFailure`       | When `true`, the workflow continues even if this step fails. Default: `false`.                                                                         |

## Response Schema

When any subsequent step needs to use data from this HTTP step's response, you **MUST** define a `responseBodySchema`.

Only properties declared in the schema are available to later steps as `{{ steps.<this-step-id>.<property> }}`.

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "required": ["name", "email"]
}
```

A downstream email step can then read `{{ steps.fetch-user.name }}` and `{{ steps.fetch-user.email }}`.

## Common Patterns

- **Webhook after notification:** `POST` to `"{{payload.webhookUrl}}"` with event details in `body`.
- **REST API call:** `POST` / `PUT` to a fixed URL with subscriber or payload data.
- **Data fetch:** `GET` from an external service with `responseBodySchema` to make response available to subsequent steps.

## Guidelines

- **Never hardcode secrets or API keys** — use payload or subscriber variables instead.
- Set `Content-Type: application/json` header when sending a JSON body.
- Use `continueOnFailure: true` when the HTTP call is non-critical to the workflow.
- For `headers` and `body`: use an empty array `[]` when not needed. Never include entries with empty keys or values (e.g. `[{"key":"","value":""}]` is invalid).
- Always define `responseBodySchema` when any later step references this step's response.

## See Also

- [`step-conditions.md`](./step-conditions.md) — branch on HTTP response values (`{ "==": [{ "var": "steps.<http-step-id>.status" }, "active"] }`)
- [`email-step.md`](./email-step.md) — read HTTP response fields from a Block Editor `variable` node or HTML Liquid expression
- [`design-workflow/references/workflow-templates.md`](../../design-workflow/references/workflow-templates.md) — templates 8 and 9 show webhook and fetch-then-notify patterns
