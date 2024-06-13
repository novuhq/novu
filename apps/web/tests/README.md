# E2E Testing with Playwright

This page is a wiki about how to test the Novu web app with Playwright.

## Run E2E locally

### Use Jarvis (WIP)

Jarvis is not fully updated yet to run the E2E suite with Playwright. It will be done very soon!

### Run individually in separate shells

```bash
NOVU_ENTERPRISE=true pnpm --filter @novu/api start:test

NOVU_ENTERPRISE=true pnpm --filter @novu/worker start:test

NOVU_ENTERPRISE=true REACT_APP_API_URL='http://127.0.0.1:1336' REACT_APP_LAUNCH_DARKLY_CLIENT_SIDE_ID='' pnpm --filter @novu/web start

NOVU_ENTERPRISE=true pnpm --filter @novu/web run test:e2e
```

## FAQ

### Set a feature flag in the scope of the test

> [!NOTE]
> Launch Darkly should be disabled in E2E tests as it causes high flakiness

```ts
import { setFeatureFlag } from './utils/browser';

// ...
test.beforeEach(async ({ page }) => {
  await setFeatureFlag(page, FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED, true);
}
// ...
```
