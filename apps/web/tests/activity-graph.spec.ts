import { test, expect } from '@playwright/test';

import { getByTestId, initializeSession } from './utils.ts/browser';
import { createNotifications } from './utils.ts/plugins';

let session;

test.beforeEach(async ({ context }) => {
  session = await initializeSession(context);
  await createNotifications({
    identifier: session.templates[0].triggers[0].identifier,
    token: session.token,
    count: 25,
    organizationId: session.organization._id,
    environmentId: session.environment._id,
  });
});

test('should be able to add a new channel', async ({ page }) => {
  await page.goto('/activities');
  await expect(page).toHaveURL(/\/activities/);

  const addChannelButton = getByTestId(page, 'activity-stats-weekly-sent');
  await expect(addChannelButton).toContainText('25');
});
