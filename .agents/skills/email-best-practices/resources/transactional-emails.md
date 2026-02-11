# Transactional Email Best Practices

Clear, actionable emails that users expect and need—password resets, confirmations, OTPs.

## Core Principles

1. **Clarity over creativity** - Users need to understand and act quickly
2. **Action-oriented** - Clear purpose, obvious primary action
3. **Time-sensitive** - Send immediately (within seconds)

## Subject Lines

**Be specific and include context:**

| ✅ Good | ❌ Bad |
|---------|--------|
| Reset your password for [App] | Action required |
| Your order #12345 has shipped | Update on your order |
| Your 2FA code for [App] | Security code: 12345 |
| Verify your email for [App] | Verify your email |

Include identifiers when helpful: order numbers, account names, expiration times.

## Pre-Header

The text snippet after subject line. Use it to:
- Reinforce subject ("This link expires in 1 hour")
- Add urgency or context
- Call-to-action preview

Keep under 90 characters.

## Content Structure

**Above the fold (first screen):**
- Clear purpose
- Primary action button
- Time-sensitive details (expiration)

**Hierarchy:** Header → Primary message → Details → Action button → Secondary info

**Format:** Short paragraphs (2-3 sentences), bullet points, bold for emphasis, white space.

## Mobile-First Design

60%+ emails are opened on mobile.

- **Layout:** Single column, stack vertically
- **Buttons:** 44x44px minimum, full-width on mobile
- **Text:** 16px minimum body, 20-24px headings
- **OTP codes:** 24-32px, monospace font

## Sender Configuration

| Field | Best Practice | Example |
|-------|--------------|---------|
| From Name | App/company name, consistent | [App Name] |
| From Email | Subdomain, real address | hello@mail.yourdomain.com |
| Reply-To | Monitored inbox | support@yourdomain.com |

Avoid `noreply@` - users reply to transactional emails.

## Code and Link Display

**OTP/Verification codes:**
- Large (24-32px), monospace font
- Centered, clear label
- Include expiration nearby
- Make copyable

**Buttons:**
- Large, tappable (44x44px+)
- Contrasting colors
- Clear action text ("Reset Password", "Verify Email")
- HTTPS links only

## Error Handling

**Resend functionality:**
- Allow after 60 seconds
- Limit attempts (3 per hour)
- Show countdown timer

**Expired links:**
- Clear "expired" message
- Offer to send new link
- Provide support contact

**"I didn't request this":**
- Include in password resets, OTPs, security alerts
- Link to security contact
- Log clicks for monitoring
