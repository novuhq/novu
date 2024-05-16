import { test, expect } from '@playwright/test';

import { getByTestId, initializeSession } from './utils.ts/browser';

let session;

test.beforeEach(async ({ context }) => {
  session = await initializeSession(context, { noTemplates: true });
});

test('should have a link to the docs', async ({ page }) => {
  await page.goto('/get-started');

  const getStartedFooterLeftSide = getByTestId(page, 'get-started-footer-left-side');
  await getStartedFooterLeftSide.click();

  const tryDigestPlaygroundBtn = getByTestId(page, 'try-digest-playground-btn');
  await tryDigestPlaygroundBtn.click();

  await expect(page).toHaveURL(/\/digest-playground/);
  await expect(page).toHaveTitle(/Digest Workflow Playground/);

  const learnMoreLink = page.locator('a[href^="https://docs.novu.co/workflows/digest"]');
  await expect(learnMoreLink).toHaveText('Learn more in docs');
});

test('the set up digest workflow should redirect to template edit page', async ({ page }) => {
  await page.goto('/get-started');

  const getStartedFooterLeftSide = getByTestId(page, 'get-started-footer-left-side');
  await getStartedFooterLeftSide.click();

  const tryDigestPlaygroundBtn = getByTestId(page, 'try-digest-playground-btn');
  await tryDigestPlaygroundBtn.click();

  await expect(page).toHaveURL(/\/digest-playground/);
  await expect(page).toHaveTitle(/Digest Workflow Playground/);

  const setupDigestWorkflowButton = page.getByRole('button', { name: 'Set Up Digest Workflow' });
  await setupDigestWorkflowButton.click();

  await expect(page).toHaveURL(/\/workflows\/edit/);
});

test('should show the digest workflow hints', async ({ page }) => {
  await page.goto('/get-started');

  const getStartedFooterLeftSide = getByTestId(page, 'get-started-footer-left-side');
  await getStartedFooterLeftSide.click();

  // click try digest playground
  const tryDigestPlaygroundBtn = getByTestId(page, 'try-digest-playground-btn');
  await tryDigestPlaygroundBtn.click();

  await expect(page).toHaveURL(/\/digest-playground/);
  await expect(page).toHaveTitle(/Digest Workflow Playground/);

  // click set up digest workflow
  const setupDigestWorkflowButton = page.getByRole('button', { name: 'Set Up Digest Workflow' });
  await setupDigestWorkflowButton.click();

  // in the template workflow editor
  await expect(page).toHaveURL(/\/workflows\/edit/);

  // check the digest hint
  let digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).toContainText('Set-up time interval');
  await expect(digestWorkflowTooltip).toContainText(
    'Specify for how long the digest should collect events before sending a digested event to the next step step in the workflow.'
  );
  let primaryButton = page.getByRole('button', { name: 'Next' });
  await expect(primaryButton).toBeVisible();
  let skipTourButton = page.getByRole('button', { name: 'Skip tour' });
  await expect(skipTourButton).toBeVisible();
  let dotsNavigation = getByTestId(page, 'digest-workflow-tooltip-dots-navigation');
  await expect(dotsNavigation).toBeVisible();

  // check if has digest step
  const digestNode = getByTestId(page, 'node-digestSelector');
  await expect(digestNode).toBeVisible();
  // check if digest step settings opened
  let digestSettings = getByTestId(page, 'step-editor-sidebar');
  await expect(digestSettings).toBeVisible();
  await expect(digestSettings).toContainText('All events');

  // click next on hint
  await primaryButton.click();

  // check the email hint
  digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).toContainText('Set-up email content');
  await expect(digestWorkflowTooltip).toContainText(
    'Use custom HTML or our visual editor to define how the email will look like when sent to the subscriber.'
  );
  primaryButton = page.getByRole('button', { name: 'Next' });
  await expect(primaryButton).toBeVisible();
  skipTourButton = page.getByRole('button', { name: 'Skip tour' });
  await expect(skipTourButton).toBeVisible();
  dotsNavigation = getByTestId(page, 'digest-workflow-tooltip-dots-navigation');
  await expect(dotsNavigation).toBeVisible();

  // check if email step settings opened
  digestSettings = getByTestId(page, 'step-editor-sidebar');
  await expect(digestSettings).toBeVisible();
  await expect(digestSettings).toContainText('Email');

  // click next on hint
  await primaryButton.click();

  // check the email hint
  digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).toContainText('Test your workflow');
  await expect(digestWorkflowTooltip).toContainText(
    'We will trigger the workflow multiple times to represent how it aggregates notifications.'
  );
  primaryButton = page.getByRole('button', { name: 'Got it' });
  await expect(primaryButton).toBeVisible();
  skipTourButton = page.getByRole('button', { name: 'Skip tour' });
  await expect(skipTourButton).not.toBeVisible();
  dotsNavigation = getByTestId(page, 'digest-workflow-tooltip-dots-navigation');
  await expect(dotsNavigation).toBeVisible();

  // the step settings should be hidden
  const workflowSidebar = getByTestId(page, 'workflow-sidebar');
  await expect(workflowSidebar).toBeVisible();
  await expect(workflowSidebar).toContainText('Trigger');

  // click got it should hide the hint
  await primaryButton.click();
  digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).not.toBeVisible();
});

test('should hide the digest workflow hints when clicking on skip tour button', async ({ page }) => {
  await page.goto('/get-started');

  const getStartedFooterLeftSide = getByTestId(page, 'get-started-footer-left-side');
  await getStartedFooterLeftSide.click();

  // click try digest playground
  const tryDigestPlaygroundBtn = getByTestId(page, 'try-digest-playground-btn');
  await tryDigestPlaygroundBtn.click();

  await expect(page).toHaveURL(/\/digest-playground/);
  await expect(page).toHaveTitle(/Digest Workflow Playground/);

  // click set up digest workflow
  const setupDigestWorkflowButton = page.getByRole('button', { name: 'Set Up Digest Workflow' });
  await setupDigestWorkflowButton.click();

  // in the template workflow editor
  await expect(page).toHaveURL(/\/workflows\/edit/);

  // check the digest hint
  let digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).toContainText('Set-up time interval');
  const skipTourButton = page.getByRole('button', { name: 'Skip tour' });
  await skipTourButton.click();

  digestWorkflowTooltip = getByTestId(page, 'digest-workflow-tooltip');
  await expect(digestWorkflowTooltip).not.toBeVisible();
});

test('when clicking on the back button from the playground it should redirect to /get-started/preview', async ({
  page,
}) => {
  await page.goto('/get-started');

  const getStartedFooterLeftSide = getByTestId(page, 'get-started-footer-left-side');
  await getStartedFooterLeftSide.click();

  // click try digest playground
  const tryDigestPlaygroundBtn = getByTestId(page, 'try-digest-playground-btn');
  await tryDigestPlaygroundBtn.click();

  await expect(page).toHaveURL(/\/digest-playground/);
  await expect(page).toHaveTitle(/Digest Workflow Playground/);

  // click set up digest workflow
  const goBack = page.getByRole('button', { name: 'Go Back' });
  await goBack.click();

  // in the template workflow editor
  await expect(page).toHaveURL(/\/get-started\/preview/);
});
