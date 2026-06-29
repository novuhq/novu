# Step Conditions

Generate a [JSONLogic](https://jsonlogic.com) condition for step execution in the Dashboard / Novu MCP.

## When to Use

- The step **executes when the condition evaluates to `true`**.
- Use `null` to **remove** the condition (the step always executes).

## Merge vs Replace vs Remove

When editing an existing condition via the Novu MCP, decide based on the user's intent:

| Intent                                                              | Behavior                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **ADD / EXTEND** — "add", "also", "and", "in addition"              | Combine existing condition with new using AND: `{ "and": [existing, new] }`       |
| **REPLACE** — "change to", "update to", "set to", "replace with"    | Return the new condition entirely; ignore existing                                |
| **REMOVE** — "remove", "delete", "clear"                            | Return `null`                                                                     |

## Variable Reference Format

Use `var` for variable references: `{ "var": "path.to.value" }`.

| Namespace                | Source                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `payload.*`              | Trigger payload (e.g. `payload.amount`, `payload.priority`)                                                                         |
| `subscriber.*`           | Subscriber data (e.g. `subscriber.firstName`, `subscriber.isOnline`)                                                                |
| `steps.*`                | Previous step state (e.g. `steps.welcome-in-app.read`, `steps.welcome-in-app.seen`)                                                 |
| `steps.<http-step-id>.*` | HTTP step response properties **defined in its `responseBodySchema`** (e.g. `steps.fetch-user.role`)                                |

## Common Patterns

### Subscriber offline

```json
{ "==": [{ "var": "subscriber.isOnline" }, "false"] }
```

### In-App not read

```json
{ "==": [{ "var": "steps.<stepId>.read" }, "false"] }
```

### In-App not seen

```json
{ "==": [{ "var": "steps.<stepId>.seen" }, "false"] }
```

### HTTP response value equals

```json
{ "==": [{ "var": "steps.<http-step-id>.status" }, "active"] }
```

> Only when the property is declared in the HTTP step's `responseBodySchema`. See [`http-request-step.md`](./http-request-step.md).

### Payload value equals

```json
{ "==": [{ "var": "payload.priority" }, "high"] }
```

### Payload value not equals

```json
{ "!=": [{ "var": "payload.priority" }, "low"] }
```

### AND / OR / NOT

```json
{ "and": [condition1, condition2] }
```

```json
{ "or": [condition1, condition2] }
```

```json
{ "!": [condition] }
```

## Output

Return only the `skip` field: a JSONLogic object **or** `null`.

## See Also

- [`design-workflow/references/step-conditions.md`](../../design-workflow/references/step-conditions.md) — side-by-side Dashboard JSON-Logic vs Framework `skip` semantics, plus the full list of available `subscriber.*` properties and step-output paths
- [`http-request-step.md`](./http-request-step.md) — declare `responseBodySchema` so an HTTP response field becomes addressable in `steps.<http-step-id>.<property>`
- [`design-workflow/references/channel-selection.md`](../../design-workflow/references/channel-selection.md) — when to use the "subscriber offline" gate on Push
