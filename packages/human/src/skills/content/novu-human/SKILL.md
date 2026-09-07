---
name: novu-human
description: Ask a human to decide (ask / approve / choose / tell) when the action is risky, irreversible, or a real multi-way choice — not for routine in-thread chat. Use novu_human on managed agents, ctx.ask/approve/choose/tell on code-defined agents, or the human CLI when no one is watching this session.
triggers:
  - need approval
  - ask the human
  - choose between options
  - human in the loop
  - novu_human
  - ctx.approve
---

# Asking a human (HITL)

Escalate to a real person when guessing is expensive. Do **not** use HITL for routine back-and-forth in this thread — just reply.

Use it when:

- The action is risky or irreversible (delete data, deploy, spend money, send something externally visible).
- There is a genuine multi-way decision and guessing wrong is expensive — use `choose`, not a rhetorical question.
- You finished something long-running and want to notify without waiting — use `tell`.

Do **not** use it to re-gate an MCP / provider tool that is already parked on an Approve/Deny card. That is a different flow.

`choose` takes 2–10 options. `tell` is one-way and does not wait.

## How, depending on the runtime

### Managed agent (Claude / Novu-hosted)

Call the `novu_human` tool with `kind` `ask` | `approve` | `choose` | `tell`, a `prompt`, and `options` for `choose`. The card lands in this conversation. The session stays parked until the human settles it (`tell` returns as soon as it is delivered).

### Code-defined (framework) agent

Call `ctx.ask`, `ctx.approve`, `ctx.choose`, or `ctx.tell`. The verdict arrives on the next `onMessage` / `onAction` as `ctx.humanResponse`.

### Unattended (CLI / cron / no live thread)

Use the `human-cli` skill and the `human` CLI (`human ask|approve|choose|tell`).
