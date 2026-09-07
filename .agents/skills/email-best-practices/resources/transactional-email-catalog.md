# Transactional Email Catalog

A comprehensive catalog of transactional emails organized by category, plus recommended email combinations for different app types.

## When to Use This

- Planning what transactional emails your app needs
- Choosing the right emails for your app type
- Understanding what content each email type should include
- Implementing transactional email features

## Email Combinations by App Type

Use these combinations as a starting point based on what you're building.

### Authentication-Focused App

Apps where user accounts and security are core (login systems, identity providers, account management).

**Essential:**
- Email verification
- Password reset
- OTP / 2FA codes
- Security alerts (new device, password change)
- Account update notifications

**Optional:**
- Welcome email (must not be promotional)
- Account deletion confirmation

### Newsletter / Content Platform

Apps focused on content delivery and subscriptions.

**Essential:**
- Email verification
- Password reset
- Welcome email (must not be promotional)
- Subscription confirmation

**Optional:**
- OTP / 2FA codes
- Account update notifications

### E-commerce / Marketplace

Apps where users buy products or services.

**Essential:**
- Email verification
- Password reset
- Welcome email (must not be promotional)
- Order confirmation
- Shipping notifications
- Invoice / receipt
- Payment failed notices

**Optional:**
- OTP / 2FA codes
- Security alerts
- Subscription confirmations (for recurring orders)

### SaaS / Subscription Service

Apps with paid subscription tiers and ongoing billing.

**Essential:**
- Email verification
- Password reset
- Welcome email (must not be promotional)
- OTP / 2FA codes
- Security alerts
- Subscription confirmation
- Subscription renewal notice
- Payment failed notices
- Invoice / receipt

**Optional:**
- Account update notifications
- Feature change notifications (for breaking changes)

### Financial / Fintech App

Apps handling money, payments, or sensitive financial data.

**Essential:**
- Email verification
- Password reset
- OTP / 2FA codes (required for sensitive actions)
- Security alerts (all types)
- Account update notifications
- Transaction confirmations
- Invoice / receipt
- Payment failed notices

**Optional:**
- Welcome email (must not be promotional)
- Compliance notices

### Social / Community Platform

Apps focused on user interaction and community features.

**Essential:**
- Email verification
- Password reset
- Welcome email (must not be promotional)
- Security alerts

**Optional:**
- OTP / 2FA codes
- Account update notifications
- Activity notifications (mentions, replies)

### Developer Tools / API Platform

Apps targeting developers with API access and integrations.

**Essential:**
- Email verification
- Password reset
- OTP / 2FA codes
- Security alerts
- API key notifications (creation, expiration)
- Subscription confirmation
- Payment failed notices

**Optional:**
- Welcome email (must not be promotional)
- Usage alerts (approaching limits)
- Feature change notifications

### Healthcare / HIPAA-Compliant App

Apps handling protected health information.

**Essential:**
- Email verification
- Password reset
- OTP / 2FA codes (required)
- Security alerts (all types, detailed)
- Account update notifications
- Appointment confirmations

**Optional:**
- Welcome email (must not be promotional)
- Compliance notices

**Note:** Healthcare apps have strict requirements. Emails should contain minimal PHI and link to secure portals for sensitive information.

---

## Full Email Catalog

### Authentication & Security

#### Email Verification / Account Verification

**When to send:** Immediately after user signs up or changes email address.

**Purpose:** Verify the email address belongs to the user.

**Content should include:**
- Clear verification link or code
- Expiration time (typically 24-48 hours)
- Instructions on what to do
- Security notice if link is clicked by mistake

**Best practices:**
- Send immediately (within seconds)
- Include expiration notice
- Provide resend option
- Link to support if issues

#### OTP / 2FA Codes

**When to send:** When user requests two-factor authentication code.

**Purpose:** Provide time-sensitive authentication code.

**Content should include:**
- The OTP code (clearly displayed)
- Expiration time (typically 5-10 minutes)
- Security warnings
- Instructions on what to do if not requested

**Best practices:**
- Send immediately
- Code should be large and easy to read
- Include expiration prominently
- Warn about sharing codes
- Provide "I didn't request this" link

#### Password Reset

**When to send:** When user requests password reset.

**Purpose:** Allow user to securely reset forgotten password.

**Content should include:**
- Reset link (with token)
- Expiration time (typically 1 hour)
- Security warnings
- Instructions if not requested

**Best practices:**
- Send immediately
- Link expires quickly (1 hour)
- Include IP address and location if available
- Provide "I didn't request this" link
- Don't include the old password

#### Security Alerts

**When to send:** When security-relevant events occur (login from new device, password change, etc.).

**Purpose:** Notify user of account security events.

**Content should include:**
- What happened (clear description)
- When it happened
- Location/IP if available
- Action to take if suspicious
- Link to security settings

**Best practices:**
- Send immediately
- Be clear and specific
- Include actionable steps
- Provide way to report suspicious activity

### Account Management

#### Welcome Email

**When to send:** Immediately after successful account creation and verification.

**Purpose:** Welcome new users and guide them to next steps (must not be promotional).

**Content should include:**
- Welcome message
- Key features or next steps
- Links to important resources
- Support contact information

**Best practices:**
- Send after email verification
- Keep it focused and actionable
- Don't overwhelm with information
- Set expectations about future emails

#### Account Update Notifications

**When to send:** When user changes account settings (email, password, profile, etc.).

**Purpose:** Confirm account changes and provide security notice.

**Content should include:**
- What changed
- When it changed
- Action to take if unauthorized
- Link to account settings

**Best practices:**
- Send immediately after change
- Be specific about what changed
- Include security notice
- Provide easy way to revert if needed

### E-commerce & Transactions

#### Order Confirmations

**When to send:** Immediately after order is placed.

**Purpose:** Confirm order details and provide receipt.

**Content should include:**
- Order number
- Items ordered with quantities
- Pricing breakdown
- Shipping address
- Estimated delivery date
- Order tracking link (if available)

**Best practices:**
- Send within minutes of order
- Include all order details
- Make it easy to print or save
- Provide customer service contact

#### Shipping Notifications

**When to send:** When order ships, with tracking updates.

**Purpose:** Notify user that order has shipped and provide tracking.

**Content should include:**
- Order number
- Tracking number
- Carrier information
- Expected delivery date
- Tracking link
- Shipping address confirmation

**Best practices:**
- Send when order ships
- Include tracking number prominently
- Provide carrier tracking link
- Update on major tracking milestones

#### Invoices and Receipts

**When to send:** After payment is processed.

**Purpose:** Provide payment confirmation and receipt.

**Content should include:**
- Invoice/receipt number
- Payment amount
- Payment method
- Items/services purchased
- Payment date
- Downloadable PDF (if applicable)

**Best practices:**
- Send immediately after payment
- Include all payment details
- Make it easy to download/save
- Include tax information if applicable

### Subscriptions & Billing

#### Subscription Confirmations

**When to send:** When user subscribes or changes subscription.

**Purpose:** Confirm subscription details and billing information.

**Content should include:**
- Subscription plan details
- Billing amount and frequency
- Next billing date
- Payment method
- Link to manage subscription

**Best practices:**
- Send immediately after subscription
- Clearly state billing terms
- Provide easy cancellation option
- Include support contact

#### Subscription Renewal Notices

**When to send:** Before subscription renews (typically 3-7 days before).

**Purpose:** Notify user of upcoming renewal and charge.

**Content should include:**
- Renewal date
- Amount to be charged
- Payment method on file
- Link to update payment method
- Link to cancel if desired

**Best practices:**
- Send with enough notice (3-7 days)
- Be clear about amount and date
- Make it easy to update payment method
- Provide cancellation option

#### Payment Failed Notices

**When to send:** When subscription payment fails.

**Purpose:** Notify user of payment failure and provide resolution steps.

**Content should include:**
- What happened
- Amount that failed
- Reason for failure (if available)
- Steps to resolve
- Link to update payment method
- Consequences if not resolved

**Best practices:**
- Send immediately after failure
- Be clear about consequences
- Provide easy resolution path
- Include support contact

### Notifications & Updates

#### Feature Announcements (Transactional)

**When to send:** When a feature the user is using changes significantly.

**Purpose:** Notify users of changes that affect their use of the service.

**Content should include:**
- What changed
- How it affects the user
- What action (if any) is needed
- Link to more information

**Best practices:**
- Only for significant changes
- Focus on user impact
- Provide clear next steps
- Link to documentation

**Note:** General feature announcements are marketing emails. Only send as transactional if the change directly affects an active feature the user is using.

## Related Topics

- [Email Types](./email-types.md) - Understanding transactional vs marketing
- [Transactional Emails](./transactional-emails.md) - Best practices for sending transactional emails
- [Compliance](./compliance.md) - Legal requirements for each email type
