# Novu Agent Starter for Vercel

Deploy a self-hosted Novu agent to Vercel in one click. Production deploys register the agent bridge once; preview deploys auto-wire to your Novu Development environment.

[![Deploy with Novu](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnovuhq%2Fnovu-agent-starter&integration-ids=novu&env=NOVU_SECRET_KEY&env=NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER&envDescription=Novu%20credentials%20are%20injected%20by%20the%20Novu%20Vercel%20integration&project-name=novu-agent)

> Replace `integration-ids=novu` with the Novu connectable-account integration slug from the Vercel partner dashboard if it differs.

## Required environment variables

The Novu Vercel integration injects these automatically when you deploy through the button above:

| Variable | Description |
|---|---|
| `NOVU_SECRET_KEY` | Novu API secret key for the linked environment |
| `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` | Novu application identifier |

If your first deploy runs before the integration finishes connecting, trigger a redeploy from the Vercel dashboard after linking Novu.

## After deploy

1. Open the Novu dashboard Vercel onboarding checklist to confirm the production bridge is registered.
2. From your project directory, connect a channel:

   ```bash
   npx novu connect
   ```

3. Edit `app/novu/agents/support-agent.tsx` and push to redeploy your agent logic.

## Local development

```bash
npm install
npm run dev:novu
```

## Learn more

- [Novu Agents docs](https://docs.novu.co/agents)
- [Novu Framework SDK](https://docs.novu.co/framework)
- [Novu on Vercel Marketplace](https://vercel.com/marketplace/novu)
