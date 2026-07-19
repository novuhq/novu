# Channel Selection

Decision rules for picking which channels a workflow should send on. Applies to both Dashboard- and Framework-authored workflows.

## Decision Tree

```
                       Did the user specify exact channels?
                                       │
                  ┌────────────── yes ──┴── no ─────────────┐
                  ▼                                          ▼
         Use ONLY those channels.                 Pick from channels CONFIGURED
         No fallbacks. No extras.                 in the organization, in priority
         Add the channel even if it               order, up to 3 channels:
         isn't configured (user asked).
                                                  In-App  >  Email  >  Chat
                                                  >  Push  >  SMS
```

## Rule 1 — User-Specified Channels Are Exact

If the user mentions channels (`"send a push notification…"`, `"email and SMS only"`), use exactly those channels. Do **not** add fallbacks. Do **not** drop a channel because it's not configured — the user explicitly asked for it.

> "Create a push notification when order ships"
>
> ```
> Trigger
>   ↓
> Push
> ```

> "Notify users via email and SMS when their invoice is overdue"
>
> ```
> Trigger
>   ↓
> Email
>   ↓
> SMS
> ```

## Rule 2 — Default Selection (No User Preference)

When the user doesn't specify channels, choose from channels **configured in the organization** in this order:

1. **In-App**
2. **Email**
3. **Chat**
4. **Push**
5. **SMS**

Stop at 3 channels. Skipping is fine — pick the most relevant subset, not the first 3.

## Per-Channel Guidance

### In-App

- Default for any in-product content.
- Always include if the recipient is signed-in and could be using your product.
- Skip when the user can't see it: password reset, OTP, pre-signup welcome, anything sent before account exists.

### Email

- Use for receipts, documentation, async communication, things the user will want to find later.
- Default fallback after In-App.
- Skip for pure conversational pings (use In-App or Push instead).

### Chat (Slack / Teams / Discord)

- Add when the channel is configured **and** `severity >= MEDIUM`.
- Best for ops, deploys, internal alerts, B2B workflows.
- Skip for marketing, low-severity nudges, or anything aimed at end consumers.

### Push

- Use as a fallback when the subscriber is **offline** but needs immediate awareness.
- Always pair with a step condition: only send when `subscriber.isOnline == false`.
- Skip when the subscriber is online (the In-App alert covers it).

### SMS

- Last resort. Reserve for true emergencies, OTP, regulatory compliance.
- Add for `critical: true` workflows where every channel matters.
- Skip if any other channel reaches the user.

## Combining Rules with Severity

| Severity | Suggested channel mix (no user pref)                                  |
| -------- | --------------------------------------------------------------------- |
| unset    | In-App + Email + (Push if offline)                                    |
| `LOW`    | In-App + Email                                                        |
| `MEDIUM` | In-App + Email + Chat (if configured)                                 |
| `HIGH`   | In-App + Chat + Email + Push (if offline)                             |
| `critical: true` | All available channels in parallel; Push gated by offline      |

## Quick Examples

- **Order confirmation** — In-App, Email, Push (offline only)
- **Comment on post** — In-App, Push (offline only), Email (only if In-App unread after delay)
- **Payment failed** — In-App, Chat, Email, Push (offline only)
- **Account suspended** (`critical: true`) — In-App, Email, SMS, Chat, Push (offline only)
- **Forgot password** (`critical: true`, no In-App) — Email, SMS

## See Also

- [`severity-and-critical.md`](./severity-and-critical.md) — how severity & `critical` change the channel mix
- [`step-conditions.md`](./step-conditions.md) — how to gate Push on `subscriber.isOnline`
- [`workflow-templates.md`](./workflow-templates.md) — the 9 templates with their channel choices
