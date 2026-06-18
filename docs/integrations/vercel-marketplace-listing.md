# Novu Vercel Marketplace Listing (Partner Portal)

Use this copy when updating the Novu connectable-account listing in the Vercel partner dashboard.

## Title

Novu Agents for Vercel

## Short description

Deploy a self-hosted AI agent to Vercel once, then talk to it from Slack, Telegram, email, and more.

## Long description

Build conversational agents on Vercel with the Novu Framework SDK and connect them to any channel in minutes.

Unlike workflow bridges that re-sync metadata on every deploy, Novu agents register a stable production bridge URL once. Every future git push updates your agent logic behind the same URL.

**What you get**

- One-click deploy of a Novu agent starter to Vercel
- Automatic env var injection (`NOVU_SECRET_KEY`, application identifier)
- Production bridge registration on first deploy
- Preview deployments auto-wired to Novu Development
- Channel setup via `npx novu connect`

Notification workflows remain supported for teams that still use code-first workflow sync.

## Primary CTA

Deploy with Novu

Button URL template:

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnovuhq%2Fnovu-agent-starter&integration-ids=<NOVU_INTEGRATION_SLUG>&env=NOVU_SECRET_KEY&env=NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER&envDescription=Injected%20by%20the%20Novu%20Vercel%20integration&project-name=novu-agent
```

## Screenshots / demo assets to refresh

1. Deploy button flow (Vercel clone wizard + Novu account connect)
2. Novu dashboard Vercel onboarding checklist with bridge connected
3. Agent answering in Slack (hero GIF)

## Configure URL

Keep pointing to the Novu dashboard Vercel integration route:

```text
https://dashboard.novu.co/partner-integrations/vercel
```

## Notes for partner ops

- Novu remains a **connectable account** integration (not native).
- First deploy may require a redeploy if env vars are injected after the initial build starts.
- Agent auto-registration requires `IS_CONVERSATIONAL_AGENTS_ENABLED` for the org/environment.
