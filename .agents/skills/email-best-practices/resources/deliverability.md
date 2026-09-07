# Email Deliverability

Maximizing the chances that your emails are delivered successfully to the recipients.

## Email Authentication

**Required by Gmail/Yahoo/Microsoft** - unauthenticated emails will be rejected or spam-filtered.

### SPF (Sender Policy Framework)

Specifies which servers can send email for your domain.

```
v=spf1 include:amazonses.com ~all
```

- Add TXT record to DNS
- Use `~all` (soft fail)

### DKIM (DomainKeys Identified Mail)

Cryptographic signature proving email authenticity.

- Your email service will provide you with a TXT record

### DMARC

Policy for handling SPF/DKIM failures + reporting.

```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

**Rollout:** `p=none` (monitor) → `p=quarantine; pct=25` → `p=reject`

Learn more: https://resend.com/blog/dmarc-policy-modes 

### Verify Your Setup

Check DNS records directly:

```bash
# SPF record
dig TXT yourdomain.com +short

# DKIM record (replace 'resend' with your selector)
dig TXT resend._domainkey.yourdomain.com +short

# DMARC record
dig TXT _dmarc.yourdomain.com +short
```

**Expected output:** Each command should return your configured record. No output = record missing.

## Sender Reputation

### IP Warming

New IP/domain? Gradually increase volume:

| Week | Daily Volume |
|------|-------------|
| 1 | 50-100 |
| 2 | 200-500 |
| 3 | 1,000-2,000 |
| 4 | 5,000-10,000 |

Start with engaged users. Send consistently. Don't rush.

Learn more: https://resend.com/docs/knowledge-base/warming-up

### Maintaining Reputation

**Do:** Send to engaged users, keep bounce <4%, complaints <0.1%, remove inactive subscribers.

**Don't:** Send to purchased lists, ignore bounces/complaints, send inconsistent volumes

## Bounce Handling

| Type | Cause | Action |
|------|-------|--------|
| Hard bounce | Permanent failure to deliver | Remove immediately |
| Soft bounce | Transient failure to deliver | Retry: 1h → 4h → 24h, remove after 3-5 failures |

**Targets:** <1% good, 1-3% acceptable, 3-4% concerning, >4% critical

## Complaint Handling

**Targets:** <0.01% excellent, 0.01-0.05% good, >0.05% critical

**Reduce complaints:**
- Only send to opted-in users
- Make unsubscribe easy and immediate
- Use clear sender names and "From" addresses

**Feedback loops:** Set up with Gmail (Postmaster Tools), Yahoo, Microsoft SNDS. Remove complainers immediately.

## Infrastructure

**Dedicated sending domain:** Use different subdomains for different sending purposes (e.g., `t.yourdomain.com` for transactional emails and `m.yourdomain.com` for marketing emails). 

**DNS TTL:** Low (300s) during setup, high (3600s+) after stable.

## Troubleshooting

**Emails going to spam?** Check in order:
1. Authentication (SPF, DKIM, DMARC)
2. Sender reputation (blacklists, complaint rates)
3. Content
4. Sending patterns (sudden volume spikes)

**Diagnostic tools:** [Google Postmaster Tools](https://postmaster.google.com)

## Related

- [List Management](./list-management.md) - Handle bounces and complaints to protect reputation
- [Sending Reliability](./sending-reliability.md) - Retry logic and error handling
