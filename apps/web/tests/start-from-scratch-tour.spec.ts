import { test, expect } from '@playwright/test';

import { getByTestId, initializeSession } from './utils.ts/browser';

let session;

test.beforeEach(async ({ context }) => {
  session = await initializeSession(context, { showOnBoardingTour: true });
});

test('should show the start from scratch intro step', async ({ page }) => {
  await page.goto('/workflows/create');

  const scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  const scratchWorkflowTooltipTitle = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle).toHaveText('Discover a quick guide');

  const scratchWorkflowTooltipDescription = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription).toHaveText('Four simple tips to become a workflow expert.');

  const scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');

  const scratchWorkflowTooltipPrimaryButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton).toHaveText('Show me');
});

test('should hide the start from scratch intro step after clicking on watch later', async ({ page }) => {
  await page.goto('/workflows/create');

  const scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  const scratchWorkflowTooltipTitle = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle).toHaveText('Discover a quick guide');

  const scratchWorkflowTooltipDescription = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription).toHaveText('Four simple tips to become a workflow expert.');

  const scratchWorkflowTooltipPrimaryButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton).toHaveText('Show me');

  const scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');
  await scratchWorkflowTooltipSkipButton.click();

  await expect(scratchWorkflowTooltip).not.toBeVisible();
});

test('should show the start from scratch tour hints', async ({ page }) => {
  await page.goto('/workflows/create');

  const scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  const scratchWorkflowTooltipTitle = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle).toHaveText('Discover a quick guide');

  const scratchWorkflowTooltipDescription = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription).toHaveText('Four simple tips to become a workflow expert.');

  const scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');

  const scratchWorkflowTooltipPrimaryButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton).toHaveText('Show me');
  await scratchWorkflowTooltipPrimaryButton.click();

  const scratchWorkflowTooltipTitle2 = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle2).toHaveText('Click to edit workflow name');

  const scratchWorkflowTooltipDescription2 = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription2).toHaveText(
    'Specify a name for your workflow here or in the workflow settings.'
  );

  const scratchWorkflowTooltipPrimaryButton2 = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton2).toHaveText('Next');
  await scratchWorkflowTooltipPrimaryButton2.click();

  const scratchWorkflowTooltipTitle3 = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle3).toHaveText('Verify workflow settings');

  const scratchWorkflowTooltipDescription3 = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription3).toHaveText(
    'Manage name, identifier, group and description. Set up channels, active by default.'
  );

  const scratchWorkflowTooltipPrimaryButton3 = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton3).toHaveText('Next');
  await scratchWorkflowTooltipPrimaryButton3.click();

  const scratchWorkflowTooltipTitle4 = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle4).toHaveText('Build a notification workflow');

  const scratchWorkflowTooltipDescription4 = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription4).toHaveText(
    'Add channels you would like to send notifications to. The channels will be inserted to the trigger snippet.'
  );

  const scratchWorkflowTooltipPrimaryButton4 = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton4).toHaveText('Next');
  await scratchWorkflowTooltipPrimaryButton4.click();

  const scratchWorkflowTooltipTitle5 = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle5).toHaveText('Run a test or Get Snippet');

  const scratchWorkflowTooltipDescription5 = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription5).toHaveText(
    'Test a trigger as if it was sent from your API. Deploy it to your App by copy/paste trigger snippet.'
  );

  const gotItButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(gotItButton).toHaveText('Got it');
  await gotItButton.click();

  await expect(scratchWorkflowTooltip).not.toBeVisible();
});

test('should show the dots navigation after the intro step', async ({ page }) => {
  await page.goto('/workflows/create');

  const scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  const scratchWorkflowTooltipTitle = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle).toHaveText('Discover a quick guide');

  const scratchWorkflowTooltipDescription = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription).toHaveText('Four simple tips to become a workflow expert.');

  const scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');

  const scratchWorkflowTooltipPrimaryButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton).toHaveText('Show me');
  await scratchWorkflowTooltipPrimaryButton.click();

  const dotsNavigation = await getByTestId(page, 'scratch-workflow-tooltip-dots-navigation');
  await expect(dotsNavigation).toBeVisible();
});

test.skip('should not show the start from scratch tour hints after it is shown twice ', async ({ page }) => {
  await page.goto('/workflows/create');

  let scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  const scratchWorkflowTooltipTitle = await getByTestId(page, 'scratch-workflow-tooltip-title');
  await expect(scratchWorkflowTooltipTitle).toHaveText('Discover a quick guide');

  const scratchWorkflowTooltipDescription = await getByTestId(page, 'scratch-workflow-tooltip-description');
  await expect(scratchWorkflowTooltipDescription).toHaveText('Four simple tips to become a workflow expert.');

  const scratchWorkflowTooltipPrimaryButton = await getByTestId(page, 'scratch-workflow-tooltip-primary-button');
  await expect(scratchWorkflowTooltipPrimaryButton).toHaveText('Show me');

  let scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');
  await scratchWorkflowTooltipSkipButton.click();

  await expect(scratchWorkflowTooltip).not.toBeVisible();

  await page.reload();

  scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).toBeVisible();

  scratchWorkflowTooltipSkipButton = await getByTestId(page, 'scratch-workflow-tooltip-skip-button');
  await expect(scratchWorkflowTooltipSkipButton).toHaveText('Watch later');
  await scratchWorkflowTooltipSkipButton.click();

  const scratchWorkflowTooltip2 = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip2).not.toBeVisible();

  await page.reload();

  scratchWorkflowTooltip = await getByTestId(page, 'scratch-workflow-tooltip');
  await expect(scratchWorkflowTooltip).not.toBeVisible();
});
