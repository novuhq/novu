import {
  ChannelTypeEnum,
  chatProviders,
  EmailProviderIdEnum,
  emailProviders,
  InAppProviderIdEnum,
  inAppProviders,
  pushProviders,
  SmsProviderIdEnum,
  smsProviders,
} from '@novu/shared';
import { test, expect } from '@playwright/test';

import { getByTestId, initializeSession, isDarkTheme } from './utils.ts/browser';
import {
  checkTableLoading,
  checkTableRow,
  clickOnListRow,
  interceptIntegrationsRequest,
} from './utils.ts/integrations';
import { deleteProvider } from './utils.ts/plugins';

let session;

test.beforeEach(async ({ context }) => {
  session = await initializeSession(context);
});

test('should show the table loading skeleton and empty state', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
    modifyBody: () => ({ data: [] }),
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await checkTableLoading(page);
  await integrationsPromise;

  const noIntegrationsPlaceholder = getByTestId(page, 'no-integrations-placeholder');
  await expect(noIntegrationsPlaceholder).toBeVisible();
  await expect(noIntegrationsPlaceholder).toContainText('Choose a channel you want to start sending notifications');

  const inAppCard = getByTestId(page, 'integration-channel-card-in_app');
  await expect(inAppCard).toBeEnabled();
  await expect(inAppCard).toContainText('In-App');
  const emailCard = getByTestId(page, 'integration-channel-card-email');
  await expect(emailCard).toBeEnabled();
  await expect(emailCard).toContainText('Email');
  const chatCard = getByTestId(page, 'integration-channel-card-chat');
  await expect(chatCard).toBeEnabled();
  await expect(chatCard).toContainText('Chat');
  const pushCard = getByTestId(page, 'integration-channel-card-push');
  await expect(pushCard).toBeEnabled();
  await expect(pushCard).toContainText('Push');
  const smsCard = getByTestId(page, 'integration-channel-card-sms');
  await expect(smsCard).toBeEnabled();
  await expect(smsCard).toContainText('SMS');
});

test('should show the table loading skeleton and then table', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await checkTableLoading(page);
  await integrationsPromise;

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await expect(addProvider).toContainText('Add a provider');

  await checkTableRow(page, {
    name: 'SendGrid',
    provider: 'SendGrid',
    channel: 'Email',
    environment: 'Development',
    status: 'Active',
  });

  await checkTableRow(page, {
    name: 'Twilio',
    provider: 'Twilio',
    channel: 'SMS',
    environment: 'Development',
    status: 'Active',
  });

  await checkTableRow(page, {
    name: 'Slack',
    provider: 'Slack',
    channel: 'Chat',
    environment: 'Development',
    status: 'Active',
  });

  await checkTableRow(page, {
    name: 'Discord',
    provider: 'Discord',
    channel: 'Chat',
    environment: 'Development',
    status: 'Active',
  });

  await checkTableRow(page, {
    name: 'Firebase Cloud Messaging',
    provider: 'Firebase Cloud Messaging',
    channel: 'Push',
    environment: 'Development',
    status: 'Active',
  });

  await checkTableRow(page, {
    name: 'Novu In-App',
    isFree: false,
    provider: 'Novu In-App',
    channel: 'In-App',
    environment: 'Development',
    status: 'Active',
  });
});

test('should show the select provider sidebar', async ({ page }) => {
  await deleteProvider({
    providerId: InAppProviderIdEnum.Novu,
    channel: ChannelTypeEnum.IN_APP,
    environmentId: session.environment.id,
    organizationId: session.organization.id,
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();
  await expect(selectProviderSidebar).toContainText('Select a provider');
  await expect(selectProviderSidebar).toContainText('Select a provider to create instance for a channel');
  const search = selectProviderSidebar.locator('input[type="search"]');
  await expect(search).toHaveAttribute('placeholder', 'Search a provider...');
  const sidebarClose = getByTestId(selectProviderSidebar, 'sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const channelTabs = selectProviderSidebar.locator('[role="tablist"]');
  const activeTab = channelTabs.locator('[data-active="true"]');
  await expect(activeTab).toContainText('In-App');
  await expect(channelTabs).toContainText('In-App');
  await expect(channelTabs).toContainText('Email');
  await expect(channelTabs).toContainText('Chat');
  await expect(channelTabs).toContainText('Push');
  await expect(channelTabs).toContainText('SMS');

  const inAppGroup = getByTestId(page, 'providers-group-in_app');
  await expect(inAppGroup).toContainText('In-App');
  const emailGroup = getByTestId(page, 'providers-group-email');
  await expect(emailGroup).toContainText('Email');
  const chatGroup = getByTestId(page, 'providers-group-chat');
  await expect(chatGroup).toContainText('Chat');
  const pushGroup = getByTestId(page, 'providers-group-push');
  await expect(pushGroup).toContainText('Push');
  const smsGroup = getByTestId(page, 'providers-group-sms');
  await expect(smsGroup).toContainText('SMS');

  const allProviders = inAppProviders.concat(emailProviders, chatProviders, pushProviders, smsProviders);
  for (const provider of allProviders) {
    if (provider.id === EmailProviderIdEnum.Novu || provider.id === SmsProviderIdEnum.Novu) {
      continue;
    }

    const providerInGroup = getByTestId(selectProviderSidebar, `provider-${provider.id}`);
    await expect(providerInGroup).toContainText(provider.displayName);
  }

  const cancel = getByTestId(selectProviderSidebar, 'select-provider-sidebar-cancel');
  await expect(cancel).toContainText('Cancel');
  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should allow for searching', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const search = selectProviderSidebar.locator('input[type="search"]');
  await search.fill('Mail');

  const channelTabs = selectProviderSidebar.locator('[role="tablist"]');
  const inAppTab = channelTabs.locator('button', { hasText: 'In-App' });
  await expect(inAppTab).toBeHidden();
  const emailTab = channelTabs.locator('button', { hasText: 'Email' });
  await expect(emailTab).toBeVisible();
  const chatTab = channelTabs.locator('button', { hasText: 'Chat' });
  await expect(chatTab).toBeHidden();
  const pushTab = channelTabs.locator('button', { hasText: 'Push' });
  await expect(pushTab).toBeHidden();
  const smsTab = channelTabs.locator('button', { hasText: 'SMS' });
  await expect(smsTab).toBeHidden();

  const emailGroup = getByTestId(page, 'providers-group-email');
  await expect(emailGroup).toContainText('Email');
  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  const mailgun = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailgun}`);
  await expect(mailgun).toContainText('Mailgun');
  const mailerSend = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.MailerSend}`);
  await expect(mailerSend).toContainText('MailerSend');
  const emailWebhook = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.EmailWebhook}`);
  await expect(emailWebhook).toContainText('Email Webhook');

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should show empty search results', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const search = selectProviderSidebar.locator('input[type="search"]');
  await search.fill('safasdfasdfasdfasdfas');

  const channelTabs = selectProviderSidebar.locator('[role="tablist"]');
  const inAppTab = channelTabs.locator('button', { hasText: 'In-App' });
  await expect(inAppTab).toBeHidden();
  const emailTab = channelTabs.locator('button', { hasText: 'Email' });
  await expect(emailTab).toBeHidden();
  const chatTab = channelTabs.locator('button', { hasText: 'Chat' });
  await expect(chatTab).toBeHidden();
  const pushTab = channelTabs.locator('button', { hasText: 'Push' });
  await expect(pushTab).toBeHidden();
  const smsTab = channelTabs.locator('button', { hasText: 'SMS' });
  await expect(smsTab).toBeHidden();

  const noSearchResults = getByTestId(page, 'select-provider-no-search-results-img');
  await expect(noSearchResults).toBeVisible();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should allow selecting a provider', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const selectedProviderImage = getByTestId(
    selectProviderSidebar,
    `selected-provider-image-${EmailProviderIdEnum.Mailjet}`
  ).first();
  const isDarkThemeEnabled = await isDarkTheme(page);
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${EmailProviderIdEnum.Mailjet}.svg`
  );

  const selectedProviderName = getByTestId(selectProviderSidebar, 'selected-provider-name');
  await expect(selectedProviderName).toContainText('Mailjet');

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeEnabled();
});

test('should allow moving to create sidebar', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const createProviderInstanceSidebar = getByTestId(page, 'create-provider-instance-sidebar');
  await expect(createProviderInstanceSidebar).toBeVisible();
  await expect(createProviderInstanceSidebar).toContainText(
    'Specify assignment preferences to automatically allocate the provider instance to the Email channel.'
  );
  await expect(createProviderInstanceSidebar).toContainText('Environment');
  await expect(createProviderInstanceSidebar).toContainText('Provider instance executes only for');

  const sidebarClose = getByTestId(createProviderInstanceSidebar, 'sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const selectedProviderImage = getByTestId(
    createProviderInstanceSidebar,
    `selected-provider-image-${EmailProviderIdEnum.Mailjet}`
  ).first();
  const isDarkThemeEnabled = await isDarkTheme(page);
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${EmailProviderIdEnum.Mailjet}.svg`
  );

  const selectedProviderName = getByTestId(createProviderInstanceSidebar, 'provider-instance-name');
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Mailjet');

  const environmentRadios = createProviderInstanceSidebar.locator('[role="radiogroup"]');
  const selectedEnv = environmentRadios.locator('[data-checked="true"]');
  await expect(selectedEnv).toContainText('Development');
  await expect(environmentRadios).toContainText('Production');

  const cancel = getByTestId(createProviderInstanceSidebar, 'create-provider-instance-sidebar-cancel');
  await expect(cancel).toContainText('Cancel');
  await expect(cancel).toBeEnabled();

  const create = getByTestId(createProviderInstanceSidebar, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
});

test('should allow moving back from create provider sidebar to select provider sidebar', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const back = getByTestId(page, 'create-provider-instance-sidebar-back');
  await expect(back).toBeVisible();
  await back.click();

  selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();
});

test('should create a new mailjet integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const providerName = getByTestId(page, 'provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const close = getByTestId(updateProviderSidebar, 'sidebar-close');
  await expect(close).toBeVisible();
  await close.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Disabled',
  });
});

test('should create a new mailjet integration with conditions', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const providerName = getByTestId(page, 'provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const addConditionsButton = getByTestId(page, 'add-conditions-btn');
  await addConditionsButton.click();

  const conditionsTitle = getByTestId(page, 'conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for Mailjet Integration provider instance');

  const addConditionButton = getByTestId(page, 'add-new-condition');
  await addConditionButton.click();

  const formOn = getByTestId(page, 'conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = getByTestId(page, 'conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = getByTestId(page, 'conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = getByTestId(page, 'conditions-form-value');
  await formValue.fill('tenant123');

  let applyButton = getByTestId(page, 'apply-conditions-btn');
  await applyButton.click();

  await expect(addConditionsButton).toContainText('Edit conditions');

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  let headerAddConditions = getByTestId(updateProviderSidebar, 'header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('1');
  await headerAddConditions.click();

  const addNewCondition = getByTestId(page, 'add-new-condition');
  await addNewCondition.click();

  const conditionsFormKey = getByTestId(page, 'conditions-form-key').last();
  await conditionsFormKey.fill('identifier');

  const conditionsFormValue = getByTestId(page, 'conditions-form-value').last();
  await conditionsFormValue.fill('tenant456');

  applyButton = getByTestId(page, 'apply-conditions-btn');
  await applyButton.click();

  headerAddConditions = getByTestId(updateProviderSidebar, 'header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('2');

  await expect(page).toHaveURL(/\/integrations\//);

  const close = getByTestId(updateProviderSidebar, 'sidebar-close');
  await expect(close).toBeVisible();
  await close.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Disabled',
  });
});

test('should remove as primary when adding conditions', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, new RegExp(`SendGrid.*Development`));

  const headerAddConditions = getByTestId(page, 'header-add-conditions-btn');
  await headerAddConditions.click();

  const removePrimaryFlagModal = getByTestId(page, 'remove-primary-flag-modal');
  await expect(removePrimaryFlagModal).toBeVisible();
  await expect(removePrimaryFlagModal).toContainText('Primary flag will be removed');
  await expect(removePrimaryFlagModal).toContainText(
    'Adding conditions to the primary provider instance removes its primary status when a user applies changes by'
  );

  const cancel = removePrimaryFlagModal.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeVisible();

  const gotIt = removePrimaryFlagModal.getByRole('button', { name: 'Got it' });
  await expect(gotIt).toBeVisible();
  await gotIt.click();

  const conditionsTitle = getByTestId(page, 'conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for SendGrid provider instance');

  const addConditionButton = getByTestId(page, 'add-new-condition');
  await addConditionButton.click();

  const formOn = getByTestId(page, 'conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = getByTestId(page, 'conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = getByTestId(page, 'conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = getByTestId(page, 'conditions-form-value');
  await formValue.fill('tenant123');

  let applyButton = getByTestId(page, 'apply-conditions-btn');
  await applyButton.click();

  const providerName = page.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('SendGrid test');

  const fromField = getByTestId(page, 'from');
  await fromField.fill('info@novu.co');

  const senderName = getByTestId(page, 'senderName');
  await senderName.fill('Novu');

  const updateButton = getByTestId(page, 'update-provider-sidebar-update');
  await expect(updateButton).toContainText('Update');
  await expect(updateButton).toBeEnabled();
  await updateButton.click();

  const makePrimaryButton = page.locator('button', { hasText: 'Make primary' });
  await expect(makePrimaryButton).toBeVisible();

  const closeButton = page.locator('.mantine-Modal-close');
  await closeButton.click();
});

test('should remove conditions when set to primary', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  await expect(page).toHaveURL(/\/integrations\/create/);

  const selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  await expect(page).toHaveURL(/\/integrations\/create\/email\/mailjet/);

  const providerName = page.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const addConditionsButton = getByTestId(page, 'add-conditions-btn');
  await addConditionsButton.click();

  const conditionsTitle = getByTestId(page, 'conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for Mailjet Integration provider instance');

  const addNewCondition = getByTestId(page, 'add-new-condition');
  await addNewCondition.click();

  const formOn = getByTestId(page, 'conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = getByTestId(page, 'conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = getByTestId(page, 'conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = getByTestId(page, 'conditions-form-value');
  await formValue.fill('tenant123');

  let applyButton = getByTestId(page, 'apply-conditions-btn');
  await applyButton.click();

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const headerAddConditions = getByTestId(updateProviderSidebar, 'header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('1');

  let makePrimaryButton = getByTestId(updateProviderSidebar, 'header-make-primary-btn');
  await makePrimaryButton.click();

  const removeConditionsModal = getByTestId(page, 'remove-conditions-modal');
  await expect(removeConditionsModal).toBeVisible();
  await expect(removeConditionsModal).toContainText('Conditions will be removed');
  await expect(removeConditionsModal).toContainText('Marking this instance as primary will remove all conditions');
  const cancel = removeConditionsModal.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeVisible();
  const removeConditionsButton = removeConditionsModal.getByRole('button', { name: 'Remove conditions' });
  await expect(removeConditionsButton).toBeVisible();
  await removeConditionsButton.click();

  makePrimaryButton = getByTestId(updateProviderSidebar, 'header-make-primary-btn');
  await expect(makePrimaryButton).toBeHidden();

  const sidebarClose = getByTestId(page, 'sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, new RegExp(`Mailjet Integration.*Development`));
});

test('should update the mailjet integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  let providerName = getByTestId(page, 'provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();
  await expect(updateProviderSidebar).toContainText('Set up credentials to start sending notifications.');

  const integrationChannel = getByTestId(updateProviderSidebar, 'provider-instance-channel');
  await expect(integrationChannel).toContainText('Email');

  const integrationEnvironment = getByTestId(updateProviderSidebar, 'provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const isActive = getByTestId(updateProviderSidebar, 'is_active_id');
  await expect(isActive).toHaveValue('false');

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await expect(providerName).toHaveValue('Mailjet Integration');

  const identifier = getByTestId(updateProviderSidebar, 'provider-instance-identifier');
  await expect(identifier).toHaveValue(/mailjet/);

  const updateButton = getByTestId(updateProviderSidebar, 'update-provider-sidebar-update');
  await expect(updateButton).toBeDisabled();

  await providerName.clear();
  await providerName.fill('Mailjet Integration Updated');

  await isActive.locator('~ label').click();

  const apiKey = getByTestId(updateProviderSidebar, 'apiKey');
  await apiKey.fill('fake-api-key');

  const secretKey = getByTestId(updateProviderSidebar, 'secretKey');
  await secretKey.fill('fake-secret-key');

  const fromField = getByTestId(updateProviderSidebar, 'from');
  await fromField.fill('info@novu.co');

  const senderName = getByTestId(updateProviderSidebar, 'senderName');
  await senderName.fill('Novu');

  await expect(updateButton).toBeEnabled();
  await updateButton.click();

  const modalClose = page.locator('.mantine-Modal-close');
  await modalClose.click();
  const sidebarClose = getByTestId(page, 'sidebar-close');
  await sidebarClose.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration Updated',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Active',
  });
});

test('should update the mailjet integration from the list', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  let providerName = getByTestId(page, 'provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  let updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  let sidebarClose = getByTestId(page, 'sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, 'Mailjet Integration');

  updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const isActive = getByTestId(updateProviderSidebar, 'is_active_id');
  await expect(isActive).toHaveValue('false');

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await expect(providerName).toHaveValue('Mailjet Integration');

  const identifier = getByTestId(updateProviderSidebar, 'provider-instance-identifier');
  await expect(identifier).toHaveValue(/mailjet/);

  const updateButton = getByTestId(updateProviderSidebar, 'update-provider-sidebar-update');
  await expect(updateButton).toBeDisabled();

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration Updated');

  await isActive.locator('~ label').click();

  const apiKey = getByTestId(updateProviderSidebar, 'apiKey');
  await apiKey.fill('fake-api-key');

  const secretKey = getByTestId(updateProviderSidebar, 'secretKey');
  await secretKey.fill('fake-secret-key');

  const fromField = getByTestId(updateProviderSidebar, 'from');
  await fromField.fill('info@novu.co');

  const senderName = getByTestId(updateProviderSidebar, 'senderName');
  await senderName.fill('Novu');

  await expect(updateButton).toBeEnabled();
  await updateButton.click();

  const modalClose = page.locator('.mantine-Modal-close');
  await modalClose.click();
  sidebarClose = getByTestId(page, 'sidebar-close');
  await sidebarClose.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration Updated',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Active',
  });
});

test('should allow to delete the mailjet integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = getByTestId(page, 'add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = getByTestId(page, 'select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = getByTestId(selectProviderSidebar, `provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = getByTestId(selectProviderSidebar, 'select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  let providerName = getByTestId(page, 'provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = getByTestId(page, 'create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  let updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  let sidebarClose = getByTestId(page, 'sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, 'Mailjet Integration');

  updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const menu = updateProviderSidebar.locator('[aria-haspopup="menu"]');
  await menu.click();
  const deleteButton = updateProviderSidebar.locator('button[data-menu-item="true"]', { hasText: 'Delete' });
  await deleteButton.click();

  const deleteModal = getByTestId(page, 'delete-provider-instance-modal');
  await expect(deleteModal).toBeVisible();
  await expect(deleteModal).toContainText('Delete Mailjet Integration instance?');
  await expect(deleteModal).toContainText(
    'Deleting a provider instance will fail workflows relying on its configuration, leading to undelivered notifications.'
  );

  const cancel = deleteModal.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeEnabled();
  const deleteInstanceButton = deleteModal.getByRole('button', { name: 'Delete instance' });
  await expect(deleteInstanceButton).toBeEnabled();
  await deleteInstanceButton.click();

  const integrationsTable = getByTestId(page, 'integration-name-cell', { hasText: 'Mailjet Integration' });
  await expect(integrationsTable).toBeHidden();
});

test('should show the Novu in-app integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, new RegExp(`Novu In-App.*Development`));

  const updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();
  await expect(updateProviderSidebar).toContainText(
    'Select a framework to set up credentials to start sending notifications.'
  );

  const sidebarClose = getByTestId(updateProviderSidebar, 'sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const integrationChannel = getByTestId(updateProviderSidebar, 'provider-instance-channel');
  await expect(integrationChannel).toContainText('In-App');

  const integrationEnvironment = getByTestId(updateProviderSidebar, 'provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const linkToDocs = updateProviderSidebar.getByRole('link', { name: 'Explore set-up guide' });
  await expect(linkToDocs).toBeVisible();

  const isActive = getByTestId(updateProviderSidebar, 'is_active_id');
  await expect(isActive).toHaveValue('true');

  const isDarkThemeEnabled = await isDarkTheme(page);
  const selectedProviderImage = getByTestId(
    updateProviderSidebar,
    `selected-provider-image-${InAppProviderIdEnum.Novu}`
  );
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${InAppProviderIdEnum.Novu}.svg`
  );

  const selectedProviderName = getByTestId(updateProviderSidebar, 'provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu In-App');

  const identifier = getByTestId(updateProviderSidebar, 'provider-instance-identifier');
  await expect(identifier).toHaveValue(/novu-in-app/);

  const hmacCheckbox = getByTestId(updateProviderSidebar, 'hmac');
  await expect(hmacCheckbox).not.toBeChecked();

  const novuInAppFrameworks = getByTestId(updateProviderSidebar, 'novu-in-app-frameworks');
  await expect(novuInAppFrameworks).toContainText('Integrate In-App using a framework below');
  await expect(novuInAppFrameworks).toContainText('React');
  await expect(novuInAppFrameworks).toContainText('Angular');
  await expect(novuInAppFrameworks).toContainText('Web Component');
  await expect(novuInAppFrameworks).toContainText('Headless');
  await expect(novuInAppFrameworks).toContainText('Vue');
  await expect(novuInAppFrameworks).toContainText('iFrame');

  const updateButton = getByTestId(updateProviderSidebar, 'update-provider-sidebar-update');
  await expect(updateButton).toContainText('Update');
  await expect(updateButton).toBeDisabled();
});

test('should show the Novu in-app integration - React guide', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, new RegExp(`Novu In-App.*Development`));

  let updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const novuInAppFrameworks = getByTestId(updateProviderSidebar, 'novu-in-app-frameworks');
  await expect(novuInAppFrameworks).toContainText('React');

  const reactGuide = novuInAppFrameworks.locator('div').filter({ hasText: 'React' }).nth(1);
  await reactGuide.click();

  updateProviderSidebar = getByTestId(page, 'update-provider-sidebar');
  await expect(updateProviderSidebar).toContainText('React integration guide');

  const sidebarBack = getByTestId(updateProviderSidebar, 'sidebar-back');
  await expect(sidebarBack).toBeVisible();
  const setupTimeline = getByTestId(updateProviderSidebar, 'setup-timeline');
  await expect(setupTimeline).toBeVisible();

  const updateButton = getByTestId(updateProviderSidebar, 'update-provider-sidebar-update');
  await expect(updateButton).toContainText('Update');
  await expect(updateButton).toBeDisabled();
});

test('should show the Novu Email integration sidebar', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
    modifyBody: (body) => {
      const [firstIntegration] = body.data;
      body.data = [
        {
          _id: EmailProviderIdEnum.Novu,
          _environmentId: firstIntegration._environmentId,
          providerId: EmailProviderIdEnum.Novu,
          active: true,
          channel: ChannelTypeEnum.EMAIL,
          name: 'Novu Email',
          identifier: EmailProviderIdEnum.Novu,
        },
        ...body.data,
      ];

      return body;
    },
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);
  await integrationsPromise;

  await clickOnListRow(page, new RegExp(`Novu Email.*Development`));

  let updateProviderSidebar = getByTestId(page, 'update-provider-sidebar-novu');
  await expect(updateProviderSidebar).toContainText('Test Provider');
  await expect(updateProviderSidebar).toBeVisible();

  const isDarkThemeEnabled = await isDarkTheme(page);
  const novuEmailLogo = updateProviderSidebar.locator(
    `img[src="/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${
      EmailProviderIdEnum.Novu
    }.svg"]`
  );
  await expect(novuEmailLogo).toBeVisible();

  const integrationChannel = getByTestId(updateProviderSidebar, 'provider-instance-channel');
  await expect(integrationChannel).toContainText('Email');

  const integrationEnvironment = getByTestId(updateProviderSidebar, 'provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const selectedProviderName = getByTestId(updateProviderSidebar, 'provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu Email');

  const providerLimits = getByTestId(updateProviderSidebar, 'novu-provider-limits');
  const providerLimitsText = await providerLimits.innerText();
  await expect(providerLimitsText).toEqual(
    'Novu provider allows sending max 300 emails per month,\nto send more messages, configure a different provider'
  );

  const limitbarLimit = getByTestId(updateProviderSidebar, 'limitbar-limit');
  const limitbarText = await limitbarLimit.innerText();
  await expect(limitbarText).toEqual('300 emails per month');
});

test('should show the Novu SMS integration sidebar', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
    modifyBody: (body) => {
      const [firstIntegration] = body.data;
      body.data = [
        {
          _id: SmsProviderIdEnum.Novu,
          _environmentId: firstIntegration._environmentId,
          providerId: SmsProviderIdEnum.Novu,
          active: true,
          channel: ChannelTypeEnum.SMS,
          name: 'Novu SMS',
          identifier: SmsProviderIdEnum.Novu,
        },
        ...body.data,
      ];

      return body;
    },
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);
  await integrationsPromise;

  await clickOnListRow(page, new RegExp(`Novu SMS.*Development`));

  let updateProviderSidebar = getByTestId(page, 'update-provider-sidebar-novu');
  await expect(updateProviderSidebar).toContainText('Test Provider');
  await expect(updateProviderSidebar).toBeVisible();

  const isDarkThemeEnabled = await isDarkTheme(page);
  const novuEmailLogo = updateProviderSidebar.locator(
    `img[src="/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${SmsProviderIdEnum.Novu}.svg"]`
  );
  await expect(novuEmailLogo).toBeVisible();

  const integrationChannel = getByTestId(updateProviderSidebar, 'provider-instance-channel');
  await expect(integrationChannel).toContainText('SMS');

  const integrationEnvironment = getByTestId(updateProviderSidebar, 'provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const selectedProviderName = getByTestId(updateProviderSidebar, 'provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu SMS');

  const providerLimits = getByTestId(updateProviderSidebar, 'novu-provider-limits');
  const providerLimitsText = await providerLimits.innerText();
  await expect(providerLimitsText).toEqual(
    'Novu provider allows sending max 20 messages per month,\nto send more messages, configure a different provider'
  );

  const limitbarLimit = getByTestId(updateProviderSidebar, 'limitbar-limit');
  const limitbarText = await limitbarLimit.innerText();
  await expect(limitbarText).toEqual('20 messages per month');
});
