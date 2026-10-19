# Email Compliance

Legal requirements for email by jurisdiction. **Not legal advice—consult an attorney for your specific situation.**

## Quick Reference

| Law | Region | Key Requirement | Penalty |
|-----|--------|-----------------|---------|
| CAN-SPAM | US | Opt-out mechanism, physical address | $53k/email |
| GDPR | EU | Explicit opt-in consent | €20M or 4% revenue |
| CASL | Canada | Express consent, opt-out mechanism | $1M (individual) to $10M (organization) CAD |

## CAN-SPAM (United States)

**Requirements:**
- Accurate header info (From, To, Reply-To)
- Non-deceptive subject lines
- Physical mailing address in every email
- Clear opt-out mechanism
- Honor opt-out within 10 business days

**Transactional emails:** Can send without opt-in if related to a transaction and not promotional.

## GDPR (European Union)

**Requirements:**
- Explicit opt-in consent (not pre-checked boxes)
- Consent must be freely given, specific, informed
- Easy to withdraw consent (as easy as giving it)
- Right to access data and deletion ("right to be forgotten")
- Process unsubscribe immediately

**Consent records:** Document who, when, how, and what they consented to.

**Transactional emails:** Can send based on contract fulfillment or legitimate interest.

## CASL (Canada)

**Consent types:**
- **Express consent:** Explicit opt-in (ideal)
- **Implied consent:** Existing business relationship (2 years) or inquiry (6 months)

**Requirements:**
- Clear sender identification that will be valid for 60 days after send
- Unsubscribe functional for 60 days after send
- Process unsubscribe no later than 10 business days
- Keep consent records 3 years after expiration

## Other Regions

| Region | Law | Key Points |
|--------|-----|------------|
| Australia | Spam Act 2003 | Consent required, honor unsubscribe within 5 days |
| UK | PECR + GDPR | Same as GDPR |
| Brazil | LGPD | Similar to GDPR, explicit consent for marketing |

## Unsubscribe Requirements Summary

| Law | Timing | Notes |
|-----|--------|-------|
| CAN-SPAM | 10 business days | Must work 30 days after send |
| GDPR | Immediately | Must be as easy as opting in |
| CASL | 10 business days | Must work 60 days after send |

**Universal best practices:** Prominent link, one-click when possible, no login required, free, confirm action.

## Managing preferences vs Unsubscribe from all

Most legistlations require a one-click unsubscribe. `Managing preferences` is a nice-to-have and can lead to lower unsubscribe rate but doesn't replace `Unsubscribe`. If possible, offer both.

## Consent Management

**Record:**
- Email address
- Date/time of consent
- Method (form, checkbox)
- What they consented to
- Source (which page/form)

**Storage:** Database with timestamps, audit trail of changes, link to user account.

## Data Retention

| Law | Requirement |
|-----|-------------|
| GDPR | Keep only as long as necessary, delete when no longer needed |
| CASL | Keep consent records 3 years after expiration |

**Best practice:** Have clear retention policy, honor deletion requests promptly, review and clean regularly.

## Privacy Policy Must Include

- What data you collect
- How you use data
- Who you share data with
- User rights (access, deletion)
- How to contact about privacy

## International Sending

**Best practice:** Follow the most restrictive requirements (usually GDPR) to ensure compliance across all regions.

## Related

- [Email Capture](./email-capture.md) - Implement consent forms and double opt-in
- [Marketing Emails](./marketing-emails.md) - Consent and unsubscribe requirements
- [List Management](./list-management.md) - Handle unsubscribes and deletion requests
