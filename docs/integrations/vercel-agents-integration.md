# Vercel Agents Integration Implementation Notes

Track implementation work in Linear before opening the PR. Suggested title:

`feat(api,dashboard): agents-first Vercel marketplace integration`

Suggested PR title format:

`feat(api,dashboard): agents-first Vercel integration (fixes NV-XXXX)`

## Shipped in repo

- Smart Vercel bridge registration for agents via `SyncAgentsFromBridge`
- Stable production alias resolution in deployment webhook
- Preview deployments register dev bridge URLs
- Dashboard Vercel onboarding checklist
- Public starter template under `starter/novu-agent-starter`
- Marketplace listing copy under `docs/integrations/vercel-marketplace-listing.md`

## Manual follow-ups

1. Publish `starter/novu-agent-starter` to `github.com/novuhq/novu-agent-starter`
2. Update Vercel partner portal listing using `docs/integrations/vercel-marketplace-listing.md`
3. Confirm connectable-account integration slug for Deploy button URL
