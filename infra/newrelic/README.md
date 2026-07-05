# New Relic dashboards

## API Usage Overview

Dashboard for exploring **which organizations use which API endpoints**, broken down by:

- **Deployment region** — derived from APM app name (`[PROD-US] - API`, `[PROD-EU] - API`, …)
- **Organization ID** — MongoDB org id from APM custom attributes
- **Novu environment ID** — workspace environment within an org (dev/prod)

### Pages

| Page | Purpose |
|------|---------|
| **Overview** | Regional traffic, top orgs, error rate, response time |
| **By organization** | Endpoint breakdown; filter by org ID in the variable bar |
| **Spikes** | Compare last hour vs yesterday; trigger endpoint anomalies |

### Deploy

**Option A — script (recommended)**

```bash
export NEW_RELIC_API_KEY="NRAK-..."
node infra/newrelic/scripts/create-api-usage-dashboard.mjs
```

To update an existing dashboard:

```bash
node infra/newrelic/scripts/create-api-usage-dashboard.mjs --update <dashboard-guid>
```

**Option B — manual import**

1. Open [New Relic One](https://one.eu.newrelic.com) → Dashboards → **Import dashboard**
2. Paste the contents of `dashboards/api-usage-overview.json` (pages/widgets section) or use the script output

### Filters

Use the dashboard variable bar:

- **Region (deployment)** — US, EU, UK, SG, AU, KR, JP, DEV, EE, or All
- **Organization ID** — paste a MongoDB org id to drill into one customer
- **Novu environment ID** — optional workspace env filter

### Data source

Uses APM `Transaction` events. Requires `organizationId` and `environmentId` custom attributes (already set on JWT/API-key authenticated requests).

Internal and inbox/widget traffic may not have org attribution unless extended (see `apps/api/src/app/auth/services/passport/newrelic.util.ts`).

### Account

Default account ID: `3812408` (EU). Update `accountId` in the JSON if deploying elsewhere.
