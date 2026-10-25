# Agent Inbox docs

Mintlify site for Agent Inbox. It is a separate project from the Novu docs in `docs/`, and it is meant to be served at `docs.agentinbox.md`.

Preview from this directory:

```bash
npx mint dev
```

Point a Mintlify project at this directory as its content path, on `docs.agentinbox.md`. The Novu docs deployment reads `docs/` only, so these pages do not publish on `docs.novu.co`.

After that domain serves this site, point the product at it:

- `DOCS_URL` in `apps/human-dashboard/src/components/dashboard/nav.ts`
- `QUICKSTART_URL` in `apps/human-dashboard/src/app/(account)/cli/login/cli-login.tsx`
- `DEFAULT_DOCS_URL` in `apps/agent-inbox-mcp/src/index.ts`
- `DOCS_URL` in each environment of `apps/agent-inbox-mcp/wrangler.jsonc`

Those still open the npm package page, which is what the dashboard and the MCP server use until the docs domain exists.
