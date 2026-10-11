---
status: accepted
date: 2026-10-01
---

# Human accounts use their own Clerk app, backed by hidden Novu organizations

Operators sign up on gethuman.md and must never see Novu, yet Human runs on Novu's API and database, which only accept organizations that exist in Novu's Clerk app. Sharing that Clerk app with gethuman.md as a satellite domain cannot keep sign-up on gethuman.md: Clerk requires sign-in and sign-up to happen on the primary domain, which is Novu's, and it sends its emails from Novu's Clerk app. So Human has its own Clerk app, and each Human account gets a hidden backing organization (a Novu Clerk user and organization) that one private Novu endpoint creates on the server; the hidden user's email is a made-up address under `users.gethuman.md`, so Novu never emails the operator and it never clashes with a real Novu account.

## Considered options

- Satellite domains on Novu's Clerk app. Rejected: sign-up would happen on a novu.co page with Novu's emails, Novu and Human would share one list of users (an existing Novu user would sign in and get an extra org), and the active organization would be shared with the Novu dashboard. Cost was not the blocker; Novu is on a paid Clerk plan.
- The operator's real email on the hidden Novu user. Rejected: it clashes with existing Novu accounts, lets Novu's own emails reach the operator, and needs email changes synced.

## Consequences

- There is no single sign-on between Novu and Human: the same email can hold both a Novu account and a Human account, and a Human account has no direct path into the Novu dashboard.
- Novu's own tools only see the made-up address; the Human user ID is kept in the hidden Clerk user's and organization's private metadata.
- Novu's normal organization setup still runs for every backing organization (environments, integrations, analytics, a Stripe customer).
