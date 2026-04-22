---
name: dashboard-workflow
description: Create or update Novu workflows directly in the Novu Dashboard via the Novu MCP server (no source code required). Complements the official `trigger-notification` skill by covering workflow authoring end.
triggers:
  - the user prefers no-code workflows
  - "make this workflow in the dashboard"
  - non-technical operators will edit it later
---

# Dashboard workflows via the Novu MCP server

Use this skill instead of `@novu/framework` when the user wants to keep workflow authoring in the Novu Dashboard (e.g. so non-engineers can iterate on copy / channels later).

The Novu MCP server is mounted in this Envoy session under the name `novu`. Use the MCP tools directly — do NOT scaffold framework code in this case.

## Recommended tool order

1. `list_workflows` — verify whether a workflow with the desired identifier already exists.
2. `create_workflow` — create the workflow with a stable identifier (kebab-case, e.g. `welcome-onboarding-email`). Provide:
   - `name` (human readable)
   - `workflowId` (stable identifier)
   - `steps`: an ordered list of channels (`in_app`, `email`, `sms`, `push`, `chat`, `digest`, `delay`).
   - For each step, supply `name`, `controlValues` (subject, body, etc.), and a `stepId`.
3. `get_workflow` — read the result back to confirm the dashboard saved everything.
4. (optional) `trigger_workflow` — fire a smoke test using a known subscriber.

## Example: in-app + email welcome

Call `create_workflow` with arguments such as:

```json
{
  "workflowId": "welcome-onboarding-email",
  "name": "Welcome onboarding",
  "steps": [
    {
      "stepId": "send-inbox",
      "type": "in_app",
      "name": "In-app welcome",
      "controlValues": {
        "subject": "Welcome to {{payload.productName}}!",
        "body": "Hi {{payload.name}}, glad to have you on board."
      }
    },
    {
      "stepId": "send-email",
      "type": "email",
      "name": "Welcome email",
      "controlValues": {
        "subject": "Welcome, {{payload.name}}",
        "body": "<p>Thanks for joining {{payload.productName}}.</p>"
      }
    }
  ]
}
```

Then wire `trigger` calls (see the official `trigger-notification` skill) to fire `welcome-onboarding-email` whenever the user signs up.

## Verification checklist

- [ ] The workflow is visible in the Novu Dashboard for the user's environment.
- [ ] The `workflowId` matches the string the application's `trigger` call uses.
- [ ] The user has been told where to edit the workflow content in the dashboard later.
