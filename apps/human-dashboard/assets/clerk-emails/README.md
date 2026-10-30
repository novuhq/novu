# Clerk emails

Clerk sends these eight emails itself, so they aren't part of the app. Each file is pasted into the Clerk Dashboard and matches the frame of the other Agent Inbox emails (`apps/api/src/app/human/email/human-email-layout.ts`). Change them together.

They are in the markup of Clerk's editor (`re-*` tags). Only the placeholders in the table exist on each template.

| File | Clerk template | Subject to set | Placeholders |
|---|---|---|---|
| `verification-code.html` | Verification code | `{{otp_code}} is your Agent Inbox code` | `otp_code`, `requested_from`, `requested_at` |
| `reset-password-code.html` | Reset password code | `{{otp_code}} resets your Agent Inbox password` | `otp_code`, `requested_from`, `requested_at` |
| `invitation.html` | Invitation | `You’re invited to Agent Inbox` | `action_url`, `invitation.expires_in_days` |
| `password-changed.html` | Password changed | `Your Agent Inbox password was changed` | `greeting_name`, `primary_email_address` |
| `password-removed.html` | Password removed | `Your Agent Inbox password was removed` | `greeting_name`, `primary_email_address` |
| `primary-email-address-changed.html` | Primary email address changed | `Your Agent Inbox email address changed` | `new_email_address` |
| `new-device-sign-in.html` | Sign in from new device | `New sign-in to your Agent Inbox account` | `sign_in_method`, `browser_name`, `operating_system`, `location`, `ip_address`, `session_created_at`, `revoke_session_url`, `support_email` |
| `account-locked.html` | Account Locked | `Your Agent Inbox account is locked` | `locked_date`, `failed_attempts`, `lockout_duration` |

## Where they go

| Clerk project | Used by |
|---|---|
| Agent Inbox, Development | Local |
| Agent Inbox, Production | Production |
| Human Staging, Development | Staging |

## Pasting one

1. Open the project, then **Configure › Customization › Emails**, then the template. The Authentication and Security tabs hold them.
2. Press `<>` above the body, replace everything in the box with the file, and press `<>` again to see it.
3. Set the subject from the table and press **Save**.

- Clerk's **Preview** only shows what is saved, so save first to see a template rendered with sample data. A reload right after **Save** can still show the old version for a moment.
- Clerk restyles every link: it forces an underline and its own font. That's why the wordmark is plain text, not a link. Headings only take `normal` or `bold`.
- **Discard edits** doesn't clear a draft left in the `<>` view. Reload the page instead.
- Agent Inbox's Development instance has **Copy to Production** on each template.
- Clerk's phishing check can block a save. The two code emails tell people to type the code on `agentinbox.md`, which isn't the main domain of a development instance, and that blocked **Reset password code** on staging. Clerk support confirmed the template is fine. Three blocks lock template editing until support reviews the account. Production's main domain is `agentinbox.md`, so the same check shouldn't object there.
- The logo is at `https://www.agentinbox.md/brand/agentinbox-mark.png`. It only shows once the site with that file is deployed.
