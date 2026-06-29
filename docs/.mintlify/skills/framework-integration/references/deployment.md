# Deployment

`@novu/framework` operates in a **GitOps model** — your workflows live in source control, and a sync step pushes them to Novu Cloud after each merge.

## The flow

```
1. Develop locally (Studio against your machine)
2. Open PR
3. CI runs `npx novu sync` against Development env
4. Test e2e in Development
5. Merge to main
6. CI runs `npx novu sync` against Production env
```

Each Novu environment (**Development**, **Production**) has its own secret key. You sync once per environment.

## Environments

| Environment | Purpose | Secret key |
| --- | --- | --- |
| **Local Studio** | Develop against your machine via tunnel | (uses dev secret key) |
| **Development** | Staging — non-technical peers preview controls | `NOVU_SECRET_KEY` (dev) |
| **Production** | Customer-facing triggers | `NOVU_SECRET_KEY` (prod) |

Get keys from `https://dashboard.novu.co/api-keys` for each environment.

## CLI Sync

```bash
npx novu@latest sync \
  --bridge-url <YOUR_DEPLOYED_URL_WITH_BRIDGE_ENDPOINT> \
  --secret-key <NOVU_SECRET_KEY> \
  --api-url https://api.novu.co
```

For EU customers:

```bash
npx novu@latest sync \
  --bridge-url <YOUR_DEPLOYED_URL_WITH_BRIDGE_ENDPOINT> \
  --secret-key <NOVU_SECRET_KEY> \
  --api-url https://eu.api.novu.co
```

### What does sync push?

- Workflow registrations (id, name, description, tags, preferences)
- Step definitions (id, type, control schemas, default values)
- Payload schemas

The bridge URL is **stored** so Novu Cloud knows where to fetch step content at trigger time.

### Sync via Vercel Preview

Free-tier preview URLs are deployment-protected by default. Enable [Protection Bypass for Automation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection) in your Vercel project settings, then pass the bypass token in the bridge URL:

```bash
npx novu@latest sync \
  --bridge-url "https://my-app-preview.vercel.app/api/novu?x-vercel-protection-bypass=$BYPASS_TOKEN" \
  --secret-key $NOVU_SECRET_KEY
```

## GitHub Actions

Use the [`novuhq/actions-novu-sync@v2`](https://github.com/novuhq/actions-novu-sync) action.

### Production sync on `main`

```yaml
name: Sync workflows to Novu Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Sync state to Novu
        uses: novuhq/actions-novu-sync@v2
        with:
          secret-key: ${{ secrets.NOVU_SECRET_KEY }}
          bridge-url: ${{ secrets.NOVU_BRIDGE_URL }}
          api-url: https://api.novu.co
```

### Development sync on PR

```yaml
name: Sync workflows to Novu Development

on:
  pull_request:
    branches: [main]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - name: Sync state to Novu (Dev)
        uses: novuhq/actions-novu-sync@v2
        with:
          secret-key: ${{ secrets.NOVU_DEV_SECRET_KEY }}
          bridge-url: ${{ secrets.NOVU_DEV_BRIDGE_URL }}
          api-url: https://api.novu.co
```

### Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `secret-key` | Yes | — | `NOVU_SECRET_KEY` for the target environment |
| `bridge-url` | Yes | — | Public URL of the deployed bridge (`https://app.com/api/novu`) |
| `api-url` | No | `https://api.novu.co` | Use `https://eu.api.novu.co` for EU |

## Other CI/CD

All other CI tools can use the CLI directly. Examples:

### GitLab CI

```yaml
sync_novu:
  image: node:20
  script:
    - npx novu@latest sync --bridge-url $NOVU_BRIDGE_URL --secret-key $NOVU_SECRET_KEY
  only:
    - main
```

### CircleCI

```yaml
version: 2.1
jobs:
  sync-novu:
    docker:
      - image: cimg/node:20.11
    steps:
      - run: npx novu@latest sync --bridge-url $NOVU_BRIDGE_URL --secret-key $NOVU_SECRET_KEY

workflows:
  deploy:
    jobs:
      - sync-novu:
          filters:
            branches:
              only: main
```

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Sync Novu') {
      when { branch 'main' }
      steps {
        sh 'npx novu@latest sync --bridge-url $NOVU_BRIDGE_URL --secret-key $NOVU_SECRET_KEY'
      }
    }
  }
}
```

### Bitbucket Pipelines

```yaml
pipelines:
  branches:
    main:
      - step:
          image: node:20
          script:
            - npx novu@latest sync --bridge-url $NOVU_BRIDGE_URL --secret-key $NOVU_SECRET_KEY
```

### Azure DevOps

```yaml
trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: npx novu@latest sync --bridge-url $(NOVU_BRIDGE_URL) --secret-key $(NOVU_SECRET_KEY)
    displayName: "Sync Novu"
```

### Travis CI

```yaml
language: node_js
node_js:
  - "20"

deploy:
  provider: script
  script: npx novu@latest sync --bridge-url $NOVU_BRIDGE_URL --secret-key $NOVU_SECRET_KEY
  on:
    branch: main
```

## Recommended Pipeline Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ PR opened / updated                                              │
│   1. Build & test app                                            │
│   2. Deploy preview to Vercel/Render                             │
│   3. `npx novu sync --bridge-url <preview> --secret-key DEV`     │
│   4. Run e2e tests against Dev environment                       │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ PR merged to main                                                │
│   1. Deploy app to production                                    │
│   2. `npx novu sync --bridge-url <prod> --secret-key PROD`       │
└──────────────────────────────────────────────────────────────────┘
```

## Common Issues

### "Failed to reach bridge URL"

- The bridge URL must be publicly accessible over HTTPS.
- Auth middleware on `/api/novu` will block Novu — exempt that path.
- Vercel preview URLs require Protection Bypass — see above.

### "Invalid secret key"

You're syncing with the wrong environment's key. Each Novu environment has its own key — don't mix Dev and Prod.

### Workflows don't appear in Dashboard after sync

- Check the sync command exited 0 — failures may be silent in some CI environments.
- Make sure your bridge actually returns the workflow on `GET /api/novu` — Novu fetches the registration list from there.
- If you renamed a workflow, the old `workflowId` is **not** auto-deleted. Delete it manually in the Dashboard if needed.

### Sync succeeded but triggers fail

- The bridge URL stored in Novu Cloud is wrong — re-sync with the correct URL.
- Production env vars are missing on your deployed app — `NOVU_SECRET_KEY` is required even for the bridge.
