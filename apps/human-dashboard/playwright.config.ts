import { defineConfig } from '@playwright/test';

/**
 * Browser tests for the website pages (`/` and `/sapien`), against a production build on its own port, so they
 * can run beside `pnpm start` on 4300: `next build` and `next dev` keep apart folders under `.next`.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3102', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm exec next build && pnpm exec next start --hostname 127.0.0.1 --port 3102',
    url: 'http://127.0.0.1:3102/sapien',
    reuseExistingServer: false,
    // The whole dashboard is built, not only the two pages.
    timeout: 600_000,
  },
});
