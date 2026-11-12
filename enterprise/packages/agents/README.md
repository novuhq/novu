# @novu/ee-agents

Novu's own AI agents, hosted inside the Novu API. Enterprise only.

Today there is one: **NovuCopilot** (`novu-copilot`). It turns a chat prompt into a notification workflow in the user's organization, from Slack or the dashboard Copilot popover.

- `NovuAgentsRegistry.buildAll()` is the single list of agents; the API serves whatever it returns.
- To add an agent, write a factory that returns a `@novu/framework` `Agent` and register it in `NovuAgentsRegistry`.
