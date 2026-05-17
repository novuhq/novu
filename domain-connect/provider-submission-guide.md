# Domain Connect Provider Submission Guide

Use this checklist after the inbound email Domain Connect implementation is ready for provider review.

## Shared Preparation

- Confirm the final template identity: `providerId` `novu.co`, `serviceId` `inbound-email`, provider name `Novu`, and service name `Inbound Email`.
- Confirm the production dashboard redirect domain in `syncRedirectDomain`.
- Publish the RSA public key TXT record at `_dck1.domainconnect.novu.co`.
- Store the matching private key in production secret management as `DOMAIN_CONNECT_PRIVATE_KEY`.
- Submit `domain-connect/novu.co.inbound-email.json` to the public Domain Connect templates repository and run the Domain Connect linter before opening the PR.

## Cloudflare Submission

Email `domain-connect@cloudflare.com` with:

- The public template link or PR link.
- `providerId` `novu.co` and `serviceId` `inbound-email`.
- Fully qualified public key TXT hostname.
- Novu SVG logo.
- Proxy preference: not applicable for MX records.
- Optional Cloudflare account ID for restricted testing.

Before sending, verify that Cloudflare apply URLs are signed, `sig` is the final query parameter, and the public key TXT records resolve publicly.

## Vercel Submission

Email `domainconnect@vercel.com` with:

- The public template link.
- A short product video showing Novu domain setup, Vercel consent, return to Novu, and connected confirmation.
- `providerId`, `serviceId`, redirect domain, and public key TXT hostname.
- Confirmation that apply requests are signed with RSA-SHA256.

Before sending, verify that a Vercel-managed test domain returns `urlSyncUX` from `https://domainconnect.vercel.com/v2/{domain}/settings` and that Vercel's template support endpoint returns `200`.

## Launch Verification

- Cloudflare and Vercel have confirmed onboarding.
- Test domains for both providers can complete consent and create the MX record.
- Novu detects the provider, shows the auto-configure CTA, redirects to consent, returns to the domain detail page, and shows the connected confirmation after MX verification.
- Manual MX setup remains available for unsupported providers, provider cancellation, template errors, and signature errors.
