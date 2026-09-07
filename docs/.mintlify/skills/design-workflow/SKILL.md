---
name: novu-design-workflow
description: Design notification workflows the Novu way — choose channels, set severity, decide when a workflow is critical, configure digests, and route based on subscriber state. Applies to BOTH dashboard-authored and code-first (`@novu/framework`) workflows. Use when planning a new workflow, deciding which channels to include, picking severity, configuring digest behavior, or matching a use case (order confirmation, payment failed, account suspended, comment, trial expiring, password reset, webhook fan-out, fetch-then-notify) to a proven template.
---

# Design Workflow

Design rules for any Novu workflow — independent of whether you author it in the **Dashboard** (no-code) or in **code** with [`@novu/framework`](../framework-integration). The decisions here (channels, severity, critical, digest, conditions) are the same on both surfaces; only the syntax differs.

> Authoring **in code**? Pair this skill with [`framework-integration/`](../framework-integration) for `workflow(...)`, `step.*`, `controlSchema`, and Bridge Endpoint setup.
> Authoring **in the Dashboard or via the Novu MCP**? After designing here, fill in step content (subject, body, `editorType`, headers, conditions) using [`dashboard-workflows/`](../dashboard-workflows).

## When to use this skill

Use it whenever you need to **decide what a workflow should look like**:

- "Design an order-confirmation workflow"
- "Which channels should I send for a payment failure?"
- "Make this notification critical"
- "Should this be digested?"
- "Add a fallback for offline subscribers"
- "What's the right template for X?"

Do **not** use it for: triggering an existing workflow ([`trigger-notification/`](../trigger-notification)), authoring code wrappers ([`framework-integration/`](../framework-integration)), or rendering severity in the UI ([`inbox-integration/`](../inbox-integration)).

## Severity & Critical

Two independent dials. Most workflows set **neither**.

| Dial       | Values                          | Default      | Effect                                                                          |
| ---------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| `severity` | `LOW` / `MEDIUM` / `HIGH`       | unset        | Visual prioritization in the Inbox (color, glow); informs digest skip rules.    |
| `critical` | `true` / `false`                | `false`      | Bypass subscriber preferences, skip digest, no delays, all available channels.  |

Rules of thumb:

- Leave `severity` unset for most workflows. Only set it when visual prioritization is needed.
- `HIGH` = "deal with this today" (payment failed, trial expiring tomorrow).
- `critical: true` = "deliver regardless of preferences" (account suspended, security alert, password reset).
- `critical: true` ⇒ digest is automatically skipped and channels deliver immediately.

See [`references/severity-and-critical.md`](./references/severity-and-critical.md) for the full behavior matrix and the `readOnly` vs `critical` distinction.

## Channel Selection

### If the user specified channels

Use **only** those channels. Do not add fallbacks. Do not add extras. If the requested channel isn't configured in the organization, add it anyway because the user explicitly asked for it.

> "Send a push notification when the order ships" → one `push` step. Nothing else.

### If the user did NOT specify channels

Pick from channels **configured in the organization**, in this priority order, up to **3 channels**:

```
In-App  >  Email  >  Chat  >  Push  >  SMS
```

| Channel | Use it for                                                                                          | Skip it when                                                |
| ------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| In-App  | Default for in-product content. Always include if the user is in your product.                      | The recipient can't see it (password reset, OTP, pre-signup) |
| Email   | Receipts, documentation, async communication. Default fallback after In-App.                        | Pure conversational pings inside the product                 |
| Chat    | If configured AND `severity >= MEDIUM`. Slack/Teams for ops & internal flows.                       | Marketing or low-severity nudges                             |
| Push    | Fallback when subscriber is **offline** but needs immediate awareness.                              | Subscriber is online (use In-App instead)                    |
| SMS     | Last resort. Only when no other channel works (true emergencies, OTP, regulatory).                  | Anything that fits in Email or Push                          |

See [`references/channel-selection.md`](./references/channel-selection.md) for the full decision tree.

## Digest Defaults

When you add a digest step, default to:

- `type: "regular"`
- look-back window: **5 minutes**
- digest time: **1 hour**
- key: `subscriberId` (and `+threadId` for conversational flows)

**Skip the digest** when:

- `severity: HIGH`, or
- `critical: true`

See [`references/digest-defaults.md`](./references/digest-defaults.md) for digest key composition and conversational examples.

## User-State Logic

Adapt routing based on whether the subscriber is online:

| State    | Behavior                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Online   | Send In-App immediately. Skip Push. Delay Email/Chat based on severity.                                 |
| Offline  | Use Push or Chat to get attention.                                                                      |

Default delays:

- **B2B** apps → next work hour
- **B2C** apps → ~30 minutes

The condition for "subscriber offline" is the same on both surfaces — see [`references/step-conditions.md`](./references/step-conditions.md).

## Workflow Templates

Match the use case to a template and copy its shape. Each template specifies severity, critical, actionable, and interaction type, plus the step ordering.

| # | Use case                       | Severity | Critical | Notes                                            |
| - | ------------------------------ | -------- | -------- | ------------------------------------------------ |
| 1 | Order Confirmation             | none     | false    | Digested, In-App + Email + Push (offline only)   |
| 2 | Comment on Your Post           | none     | false    | Digested by `subscriberId + threadId`            |
| 3 | Payment Failed                 | HIGH     | false    | In-App + Chat + Email + Push (offline)           |
| 4 | Account Suspended              | HIGH     | true     | All channels, no preferences, no digest          |
| 5 | Forgot Password                | none     | true     | Email + SMS only, no In-App                      |
| 6 | Trial Expiring Tomorrow        | HIGH     | false    | In-App + Chat + Email + Push (offline)           |
| 7 | Explicit Channel Request       | n/a      | n/a      | Use only the channels the user specified         |
| 8 | Webhook / External API Call    | varies   | varies   | Add `step.http` after channel steps              |
| 9 | Fetch Data then Notify         | varies   | varies   | `step.http` first; declare `responseBodySchema`  |

Full ASCII flows + per-template metadata in [`references/workflow-templates.md`](./references/workflow-templates.md).

## Step Conditions

Conditions decide whether a step runs. Use them for "send only if subscriber is offline", "send email only if In-App wasn't seen", and similar fallbacks.

- **Dashboard** authors write [JSON-Logic](https://jsonlogic.com): `{ "==": [{ "var": "subscriber.isOnline" }, "false"] }`
- **Framework** authors pass a `skip: () => boolean` callback to the step.

The semantics are identical. See [`references/step-conditions.md`](./references/step-conditions.md) for the canonical snippets and the variables available in each scope.

## Common Pitfalls

1. **Don't set severity by default** — leave it unset unless you actually need visual prioritization.
2. **`critical: true` is not the same as `readOnly: true`** — `readOnly` only hides the workflow from the Preferences UI; `critical` bypasses preferences and digests at runtime. See [`references/severity-and-critical.md`](./references/severity-and-critical.md).
3. **Don't add fallbacks when the user named the channels** — explicit channel requests are exact.
4. **Cap the channel count at 3** when the user didn't specify channels. More channels = more annoyance, not more reach.
5. **Don't combine digest with `critical: true`** — critical workflows must deliver immediately. The digest step is auto-skipped.
6. **Digest key matters for conversational flows** — without `+threadId`, a comment on Post A and a comment on Post B end up in the same digest.
7. **Push only when offline** — sending push to an online user duplicates the In-App alert.
8. **HTTP step needs `responseBodySchema`** — without it, downstream steps can't read response properties via `{{ steps.<id>.<prop> }}`.

## References

- [Channel Selection](./references/channel-selection.md) — full decision tree and per-channel guidance
- [Severity & Critical](./references/severity-and-critical.md) — behavior matrix, preference & digest interactions, `readOnly` vs `critical`
- [Digest Defaults](./references/digest-defaults.md) — windows, keys, conversational digest patterns
- [Step Conditions](./references/step-conditions.md) — JSON-Logic snippets and Framework `skip` equivalents
- [Workflow Templates](./references/workflow-templates.md) — the 9 reference flows with severity/critical/interaction tables

## See Also

- [`dashboard-workflows/`](../dashboard-workflows) — author step content (subject, body, `editorType`, headers, conditions) for Dashboard or Novu MCP workflows
- [`framework-integration/`](../framework-integration) — implement these designs in code (`workflow()`, `step.*`, `controlSchema`, Bridge)
- [`manage-preferences/`](../manage-preferences) — how `critical` interacts with subscriber-level preferences
- [`inbox-integration/`](../inbox-integration) — how severity surfaces visually in the Inbox
- [`trigger-notification/`](../trigger-notification) — invoking a workflow once it's designed
