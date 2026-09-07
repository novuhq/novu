# Email Types: Transactional vs Marketing

Understanding the difference between transactional and marketing emails is crucial for compliance, deliverability, and user experience. This guide explains the distinctions and provides a catalog of transactional emails your app should include.

## When to Use This

- Deciding whether an email should be transactional or marketing
- Understanding legal distinctions between email types
- Planning what transactional emails your app needs
- Ensuring compliance with email regulations
- Setting up separate sending infrastructure

## Transactional vs Marketing: Key Differences

### Transactional Emails

**Definition:** Emails that facilitate or confirm a transaction the user initiated or expects. They're directly related to an action the user took or are legal notices you're required to serve.

**Characteristics:**
- User-initiated or expected
- Time-sensitive and actionable
- Required for the user to complete an action
- Does not include promotional material or offers
- Can be sent without explicit opt-in (with limitations)

**Examples:**
- Password reset links
- Order confirmations
- Account verification
- OTP/2FA codes
- Shipping notifications

**Analogy:**
Think of transactional emails for everything that would leave you with a paper receipt in the real world: invoices, parking ticket, booking confirmation, etc.

### Marketing Emails

**Definition:** Emails sent for promotional, advertising, or informational purposes that are not directly related to a specific transaction or legal requirement.

**Characteristics:**
- Promotional or informational content
- Not time-sensitive to complete a transaction
- Require explicit opt-in (consent)
- Must include unsubscribe options
- Subject to stricter compliance requirements

**Examples:**
- Newsletters
- Abandoned cart
- Product announcements
- Promotional offers
- Company updates
- Educational content

## Legal Distinctions

### CAN-SPAM Act (US)

**Transactional emails:**
- Can be sent without opt-in
- Must be related to a transaction
- Cannot contain promotional content (with exceptions)
- Must identify sender and provide contact information

**Marketing emails:**
- Require opt-out mechanism (not opt-in in US)
- Must include clear sender identification
- Must include physical mailing address
- Must honor opt-out requests within 10 business days

### GDPR (EU)

**Transactional emails:**
- Can be sent based on legitimate interest or contract fulfillment
- Must be necessary for service delivery
- Cannot contain marketing content without consent

**Marketing emails:**
- Require explicit opt-in consent
- Must clearly state purpose of data collection
- Must provide easy unsubscribe
- Subject to data protection requirements

### CASL (Canada)

**Transactional emails:**
- Can be sent without consent if related to ongoing business relationship
- Must be factual and not promotional

**Marketing emails:**
- Require express or implied consent
- Must include unsubscribe mechanism
- Must identify sender clearly

## When to Use Each Type

### Use Transactional When:

- User needs the email to complete an action
- Email confirms a transaction or account change
- Email provides security-related information
- Email is expected based on user action
- Content is time-sensitive and actionable
- You're required to serve a notification for compliance

### Use Marketing When:

- Promoting products or services
- Sending newsletters or updates
- Sharing educational content
- Announcing features or company news
- Content is not required for a transaction

## Hybrid Emails: The Gray Area

Some emails mix transactional and marketing content. This isn't best practice and should be avoided.

**Best practice:** Keep transactional and marketing separate. 

**Example of problematic hybrid:**
- Newsletter (marketing) with a small order status update (transactional)

## Transactional Email Catalog

For a complete catalog of transactional emails and recommended combinations by app type, see [Transactional Email Catalog](./transactional-email-catalog.md).

**Quick reference - Essential emails for most apps:**
1. **Email verification** - Required for account creation
2. **Password reset** - Required for account recovery
3. **Welcome email** - Good user experience

The catalog includes detailed guidance for:
- Authentication-focused apps
- Newsletter / content platforms
- E-commerce / marketplaces
- SaaS / subscription services
- Financial / fintech apps
- Social / community platforms
- Developer tools / API platforms
- Healthcare / HIPAA-compliant apps

## Sending Infrastructure

### Separate subdomains

**Best practice:** Use separate sending subdomains for transactional and marketing emails.

**Benefits:**
- Protect transactional deliverability
- Different authentication domains
- Independent reputation
- Easier compliance management

**Implementation:**
- Use different subdomains (e.g., `t.yourdomain.com` for transactional, `m.yourdomain.com` for marketing)

### Email Service Considerations

Choose an email service that:
- Provides reliable delivery for transactional emails
- Offers separate sending domains
- Has good API for programmatic sending
- Provides webhooks for delivery events
- Supports authentication setup (SPF, DKIM, DMARC)

Services like Resend are designed for transactional emails and provide the infrastructure and tools needed for reliable delivery. They also offer powerful marketing features.

## Related Topics

- [Transactional Emails](./transactional-emails.md) - Best practices for sending transactional emails
- [Marketing Emails](./marketing-emails.md) - Best practices for marketing emails
- [Compliance](./compliance.md) - Legal requirements for each email type
- [Deliverability](./deliverability.md) - Ensuring transactional emails are delivered
