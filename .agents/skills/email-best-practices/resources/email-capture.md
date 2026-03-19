# Email Capture Best Practices

Collecting email addresses responsibly with validation, verification, and proper consent.

## Email Validation

### Client-Side

**HTML5:**
```html
<input type="email" required>
```

**Best practices:**
- Validate on blur or with short debounce
- Show clear error messages
- Don't be too strict (allow unusual but valid formats)
- Client-side validation ≠ deliverability

### Server-Side (Recommended)

Always validate server-side—client-side can be bypassed.

**Check:**
- Email format (RFC 5322)
- Domain exists (DNS lookup)
- Domain has MX records
- Optionally: disposable email detection

Recommended tools: https://resend.com/blog/best-email-verification-apis 

## Double opt-in

Confirms address belongs to user and is deliverable.

### Process

1. User submits email
2. Send verification email with unique link/token
3. User clicks link
4. Mark as verified
5. Allow access/add to list

**Timing:** Send immediately, include expiration (24-48 hours), allow resend after 60 seconds, limit resend attempts (3/hour).

### Single vs Double Opt-In

| | Single Opt-In | Double Opt-In |
|--|---------------|---------------|
| **Process** | Add to list immediately | Require email confirmation first |
| **Pros** | Lower friction, faster growth | Verified addresses, better engagement, meets GDPR/CASL |
| **Cons** | Higher invalid rate, lower engagement | Some users don't confirm |
| **Use for** | Account creation, transactional | Marketing lists, newsletters |

**Recommendation:** Double opt-in for all marketing emails.

## Form Design

### Email Input

- Use `type="email"` for mobile keyboard
- Include placeholder ("you@example.com")
- Clear error messages ("Please enter a valid email address" not "Invalid")

### Consent Checkboxes (Marketing)

- **Unchecked by default** (required)
- Specific language about what they're signing up for
- Separate checkboxes for different email types
- Link to privacy policy

```
☐ Subscribe to our weekly newsletter with product updates
☐ Send me promotional offers and deals
```

**Don't:** Pre-check boxes, use vague language, hide in terms.

### Form Layout

- Keep simple and focused
- One primary action
- Clear value proposition
- Mobile-friendly
- Accessible (labels, ARIA)

## Error Handling

### Invalid Email

- Show clear error message
- Suggest corrections for common typos (@gmial.com → @gmail.com)
- Allow user to fix and resubmit

### Already Registered

- Accounts: "This email is already registered. [Sign in]"
- Marketing: "You're already subscribed! [Manage preferences]"
- Don't reveal if account exists (security)

### Rate Limiting

- Limit verification emails (3/hour per email)
- Rate limit form submissions
- Use CAPTCHA sparingly if needed
- Monitor for abuse patterns

## Verification Emails

**Content:**
- Clear purpose ("Verify your email address")
- Prominent verification button
- Expiration time
- Resend option
- "I didn't request this" notice

**Design:**
- Mobile-friendly
- Large, tappable button
- Clear call-to-action

See [Transactional Emails](./transactional-emails.md) for detailed email design guidance.

## Related

- [Compliance](./compliance.md) - Legal requirements for consent (GDPR, CASL)
- [Marketing Emails](./marketing-emails.md) - What happens after capture
- [Deliverability](./deliverability.md) - How validation improves sender reputation
