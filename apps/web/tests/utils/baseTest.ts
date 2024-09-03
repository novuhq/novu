/*
 * This is the only location where this import is allowed. We add setting contextual data
 * to every test context before execution.
 */

import { test as baseTest } from '@playwright/test';

export const test = baseTest.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      (window as any).isPlaywright = true;
    });
    await use(context);
  },
});

export { expect } from '@playwright/test';
