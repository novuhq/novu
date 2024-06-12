# E2E Testing with Playwright

This page is a wiki about how to test the Novu web app with Playwright.

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
