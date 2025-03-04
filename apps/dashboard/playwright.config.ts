import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);
dotenv.config({ path: path.resolve(dirName, '.env.playwright') });

const baseURL = `http://localhost:4201`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 5 : 3,
  /* Use 1 workers in CI, 50% of CPU count in local */
  workers: process.env.CI ? 1 : '25%',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'blob' : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  webServer: {
    command: 'pnpm start:test',
    url: baseURL,
    timeout: 180 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    permissions: ['clipboard-read'],
  },
  timeout: 180_000,
  expect: {
    timeout: 30_000,
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.e2e\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1512, height: 982 },
        video: {
          mode: 'retain-on-failure',
          size: { width: 1512, height: 982 },
        },
      },
    },
  ],
});
