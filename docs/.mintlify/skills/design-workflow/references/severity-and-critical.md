# Severity & Critical

`severity` and `critical` are two **independent** workflow-level dials. Most workflows set neither.

## Severity

| Value    | Meaning                              | When to use                                                              |
| -------- | ------------------------------------ | ------------------------------------------------------------------------ |
| unset    | No prioritization                    | Default. Use for the vast majority of workflows.                         |
| `LOW`    | Informational, no urgency            | Marketing nudges, low-priority lifecycle.                                |
| `MEDIUM` | Worth surfacing                      | Mentions, light alerts.                                                  |
| `HIGH`   | "Deal with this today"               | Payment failed, trial expiring tomorrow, KYC required.                   |

Severity is **purely visual** — it does not change preferences, digest, or delivery. It only affects how the Inbox renders the notification (color, glow, bell color), and informs the digest skip rule below.

> See [`inbox-integration/SKILL.md`](../../inbox-integration/SKILL.md) ("Severity styling") for the visual mapping (`colorSeverityHigh`, `severityHigh__notificationBar`, etc.).

## Critical

`critical: true` is the **runtime** override. When set:

- **Subscriber preferences are bypassed.** The notification is delivered even if the subscriber disabled the channel.
- **Digest is skipped.** Each trigger delivers immediately; no aggregation.
- **No delays.** All steps run as fast as possible.
- **All available channels** fire in parallel (Push still gated by `subscriber.isOnline == false`).

Reserve `critical: true` for must-deliver events:

- Account suspended / blocked
- Security alert (new device login, suspicious activity)
- Forgot password / OTP delivery
- Legal or compliance notices

> A workflow can be `critical: true` with `severity` unset — the two dials don't depend on each other.

## `readOnly` vs `critical` — the trap

These are easy to confuse. They control different things:

| Flag                                 | Where it lives                                  | What it does                                                                                |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `preferences.all.readOnly: true`     | Workflow's preference defaults                  | Hides the workflow from the **Preferences UI**. Subscribers can't toggle channels for it.   |
| `critical: true`                     | Workflow-level flag                             | Bypasses preferences, digest, and delays at **runtime**. Delivers regardless of opt-out.    |

In practice you usually want `critical: true` (forces delivery). `readOnly: true` alone just removes the toggle from the UI but does not override existing subscriber overrides. See [`manage-preferences/SKILL.md`](../../manage-preferences/SKILL.md) for the resolution order.

## Behavior Matrix

| Scenario                                          | Preferences applied? | Digest runs? | Delays applied? | Inbox styling |
| ------------------------------------------------- | -------------------- | ------------ | --------------- | ------------- |
| `severity` unset, `critical: false`               | yes                  | yes          | yes             | default       |
| `severity: HIGH`, `critical: false`               | yes                  | **no**       | yes             | high          |
| `severity: HIGH`, `critical: true`                | **no**               | **no**       | **no**          | high          |
| `severity` unset, `critical: true`                | **no**               | **no**       | **no**          | default       |

Digest is automatically skipped when `severity: HIGH` **or** `critical: true`.

## Picking the Right Combination

| Use case                          | severity | critical |
| --------------------------------- | -------- | -------- |
| Order confirmation                | unset    | false    |
| Comment on your post              | unset    | false    |
| Payment failed                    | HIGH     | false    |
| Trial expiring tomorrow           | HIGH     | false    |
| Account suspended (KYC required)  | HIGH     | **true** |
| Forgot password / OTP             | unset    | **true** |
| Security alert                    | HIGH     | **true** |
| Marketing / weekly newsletter     | unset    | false    |

## Common Pitfalls

1. **Setting `severity: HIGH` doesn't make the workflow critical** — it still respects preferences and runs delays. Add `critical: true` if you need bypass.
2. **`critical: true` doesn't auto-set severity** — set `severity: HIGH` explicitly if you also want the high-severity Inbox styling.
3. **Don't mark marketing workflows critical** — bypassing preferences for promotional content damages trust and is a deliverability risk.
4. **`readOnly: true` won't force delivery** — it only hides the workflow toggle. Use `critical: true` to actually force delivery.

## See Also

- [`channel-selection.md`](./channel-selection.md) — how `critical` expands the channel mix
- [`digest-defaults.md`](./digest-defaults.md) — when digest is auto-skipped
- [`workflow-templates.md`](./workflow-templates.md) — templates that show `critical` in context
- [`manage-preferences/SKILL.md`](../../manage-preferences/SKILL.md) — preference resolution order
