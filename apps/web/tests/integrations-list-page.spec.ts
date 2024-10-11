import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  chatProviders,
  EmailProviderIdEnum,
  emailProviders,
  InAppProviderIdEnum,
  inAppProviders,
  ProvidersIdEnum,
  PushProviderIdEnum,
  pushProviders,
  SmsProviderIdEnum,
  smsProviders,
} from '@novu/shared';
import { expect } from '@playwright/test';
import { test } from './utils/baseTest';

import { initializeSession, isDarkTheme } from './utils/browser';
import { checkTableLoading, checkTableRow, clickOnListRow, interceptIntegrationsRequest } from './utils/integrations';
import { deleteProvider, SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
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

  const noIntegrationsPlaceholder = page.getByTestId('no-integrations-placeholder');
  await expect(noIntegrationsPlaceholder).toBeVisible();
  await expect(noIntegrationsPlaceholder).toContainText('Choose a channel you want to start sending notifications');

  const inAppCard = page.getByTestId('integration-channel-card-in_app');
  await expect(inAppCard).toBeEnabled();
  await expect(inAppCard).toContainText('In-App');
  const emailCard = page.getByTestId('integration-channel-card-email');
  await expect(emailCard).toBeEnabled();
  await expect(emailCard).toContainText('Email');
  const chatCard = page.getByTestId('integration-channel-card-chat');
  await expect(chatCard).toBeEnabled();
  await expect(chatCard).toContainText('Chat');
  const pushCard = page.getByTestId('integration-channel-card-push');
  await expect(pushCard).toBeEnabled();
  await expect(pushCard).toContainText('Push');
  const smsCard = page.getByTestId('integration-channel-card-sms');
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

  const addProvider = page.getByTestId('add-provider');
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
    name: 'Novu Inbox',
    isFree: false,
    provider: 'Novu Inbox',
    channel: 'In-App',
    environment: 'Development',
    status: 'Active',
  });
});

test('should show the select provider sidebar', async ({ page }) => {
  await deleteProvider({
    providerId: InAppProviderIdEnum.Novu,
    channel: ChannelTypeEnum.IN_APP,
    environmentId: session.environment._id,
    organizationId: session.organization._id,
  });

  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();
  await expect(selectProviderSidebar).toContainText('Select a provider');
  await expect(selectProviderSidebar).toContainText('Select a provider to create instance for a channel');
  const search = selectProviderSidebar.locator('input[type="search"]');
  await expect(search).toHaveAttribute('placeholder', 'Search a provider...');
  const sidebarClose = page.getByTestId('sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const channelTabs = selectProviderSidebar.locator('[role="tablist"]');
  const activeTab = channelTabs.locator('[data-active="true"]');
  await expect(activeTab).toContainText('In-App');
  await expect(channelTabs).toContainText('In-App');
  await expect(channelTabs).toContainText('Email');
  await expect(channelTabs).toContainText('Chat');
  await expect(channelTabs).toContainText('Push');
  await expect(channelTabs).toContainText('SMS');

  const inAppGroup = page.getByTestId('providers-group-in_app');
  await expect(inAppGroup).toContainText('In-App');
  const emailGroup = page.getByTestId('providers-group-email');
  await expect(emailGroup).toContainText('Email');
  const chatGroup = page.getByTestId('providers-group-chat');
  await expect(chatGroup).toContainText('Chat');
  const pushGroup = page.getByTestId('providers-group-push');
  await expect(pushGroup).toContainText('Push');
  const smsGroup = page.getByTestId('providers-group-sms');
  await expect(smsGroup).toContainText('SMS');

  const allProviders = inAppProviders.concat(emailProviders, chatProviders, pushProviders, smsProviders);
  for (const provider of allProviders) {
    if (provider.id === EmailProviderIdEnum.Novu || provider.id === SmsProviderIdEnum.Novu) {
      continue;
    }

    const providerInGroup = page.getByTestId(`provider-${provider.id}`);
    await expect(providerInGroup).toContainText(provider.displayName);
  }

  const cancel = page.getByTestId('select-provider-sidebar-cancel');
  await expect(cancel).toContainText('Cancel');
  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should allow for searching', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
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

  const emailGroup = page.getByTestId('providers-group-email');
  await expect(emailGroup).toContainText('Email');
  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  const mailgun = page.getByTestId(`provider-${EmailProviderIdEnum.Mailgun}`);
  await expect(mailgun).toContainText('Mailgun');
  const mailerSend = page.getByTestId(`provider-${EmailProviderIdEnum.MailerSend}`);
  await expect(mailerSend).toContainText('MailerSend');
  const emailWebhook = page.getByTestId(`provider-${EmailProviderIdEnum.EmailWebhook}`);
  await expect(emailWebhook).toContainText('Email Webhook');

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should show empty search results', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
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

  const noSearchResults = page.getByTestId('select-provider-no-search-results-img');
  await expect(noSearchResults).toBeVisible();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeDisabled();
});

test('should allow selecting a provider', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const selectedProviderImage = page.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).first();
  const isDarkThemeEnabled = await isDarkTheme(page);
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${EmailProviderIdEnum.Mailjet}.svg`
  );

  const selectedProviderName = page.getByTestId('selected-provider-name');
  await expect(selectedProviderName).toContainText('Mailjet');

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await expect(next).toBeEnabled();
});

test('should allow moving to create sidebar', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const createProviderInstanceSidebar = page.getByTestId('create-provider-instance-sidebar');
  await expect(createProviderInstanceSidebar).toBeVisible();
  await expect(createProviderInstanceSidebar).toContainText(
    'Specify assignment preferences to automatically allocate the provider instance to the Email channel.'
  );
  await expect(createProviderInstanceSidebar).toContainText('Environment');
  await expect(createProviderInstanceSidebar).toContainText('Provider instance executes only for');

  const sidebarClose = page.getByTestId('sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const selectedProviderImage = page.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).first();
  const isDarkThemeEnabled = await isDarkTheme(page);
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${EmailProviderIdEnum.Mailjet}.svg`
  );

  const selectedProviderName = page.getByTestId('provider-instance-name');
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Mailjet');

  const environmentRadios = createProviderInstanceSidebar.locator('[role="radiogroup"]');
  const selectedEnv = environmentRadios.locator('[data-checked="true"]');
  await expect(selectedEnv).toContainText('Development');
  await expect(environmentRadios).toContainText('Production');

  const cancel = page.getByTestId('create-provider-instance-sidebar-cancel');
  await expect(cancel).toContainText('Cancel');
  await expect(cancel).toBeEnabled();

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
});

test('should allow moving back from create provider sidebar to select provider sidebar', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  let selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const back = page.getByTestId('create-provider-instance-sidebar-back');
  await expect(back).toBeVisible();
  await back.click();

  selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();
});

test('should create a new mailjet integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const providerName = page.getByTestId('provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const close = page.getByTestId('sidebar-close');
  await expect(close).toBeVisible();
  await close.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Active',
  });
});

test('should create a new mailjet integration with conditions', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const providerName = page.getByTestId('provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const addConditionsButton = page.getByTestId('add-conditions-btn');
  await addConditionsButton.click();

  const conditionsTitle = page.getByTestId('conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for Mailjet Integration provider instance');

  const addConditionButton = page.getByTestId('add-new-condition');
  await addConditionButton.click();

  const formOn = page.getByTestId('conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = page.getByTestId('conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = page.getByTestId('conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = page.getByTestId('conditions-form-value');
  await formValue.fill('tenant123');

  let applyButton = page.getByTestId('apply-conditions-btn');
  await applyButton.click();

  await expect(addConditionsButton).toContainText('Edit conditions');

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  let headerAddConditions = page.getByTestId('header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('1');
  await headerAddConditions.click();

  const addNewCondition = page.getByTestId('add-new-condition');
  await addNewCondition.click();

  const conditionsFormKey = page.getByTestId('conditions-form-key').last();
  await conditionsFormKey.fill('identifier');

  const conditionsFormValue = page.getByTestId('conditions-form-value').last();
  await conditionsFormValue.fill('tenant456');

  applyButton = page.getByTestId('apply-conditions-btn');
  await applyButton.click();

  headerAddConditions = page.getByTestId('header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('2');

  await expect(page).toHaveURL(/\/integrations\//);

  const close = page.getByTestId('sidebar-close');
  await expect(close).toBeVisible();
  await close.click();

  await checkTableRow(page, {
    name: 'Mailjet Integration',
    provider: 'Mailjet',
    channel: 'Email',
    environment: 'Development',
    status: 'Active',
  });
});

test('should remove as primary when adding conditions', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, /SendGrid.*Development/);

  const headerAddConditions = page.getByTestId('header-add-conditions-btn');
  await headerAddConditions.click();

  const removePrimaryFlagModal = page.getByTestId('remove-primary-flag-modal');
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

  const conditionsTitle = page.getByTestId('conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for SendGrid provider instance');

  const addConditionButton = page.getByTestId('add-new-condition');
  await addConditionButton.click();

  const formOn = page.getByTestId('conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = page.getByTestId('conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = page.getByTestId('conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = page.getByTestId('conditions-form-value');
  await formValue.fill('tenant123');

  const applyButton = page.getByTestId('apply-conditions-btn');
  await applyButton.click();

  const providerName = page.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('SendGrid test');

  const fromField = page.getByTestId('from');
  await fromField.fill('info@novu.co');

  const senderName = page.getByTestId('senderName');
  await senderName.fill('Novu');

  const updateButton = page.getByTestId('update-provider-sidebar-update');
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

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  await expect(page).toHaveURL(/\/integrations\/create/);

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  await expect(page).toHaveURL(/\/integrations\/create\/email\/mailjet/);

  const providerName = page.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const addConditionsButton = page.getByTestId('add-conditions-btn');
  await addConditionsButton.click();

  const conditionsTitle = page.getByTestId('conditions-form-title');
  await expect(conditionsTitle).toContainText('Conditions for Mailjet Integration provider instance');

  const addNewCondition = page.getByTestId('add-new-condition');
  await addNewCondition.click();

  const formOn = page.getByTestId('conditions-form-on');
  await expect(formOn).toHaveValue('Tenant');

  const formKey = page.getByTestId('conditions-form-key');
  await formKey.fill('identifier');

  const formOperator = page.getByTestId('conditions-form-operator');
  await expect(formOperator).toHaveValue('Equal');

  const formValue = page.getByTestId('conditions-form-value');
  await formValue.fill('tenant123');

  const applyButton = page.getByTestId('apply-conditions-btn');
  await applyButton.click();

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const headerAddConditions = page.getByTestId('header-add-conditions-btn');
  await expect(headerAddConditions).toContainText('1');

  let makePrimaryButton = page.getByTestId('header-make-primary-btn');
  await makePrimaryButton.click();

  const removeConditionsModal = page.getByTestId('remove-conditions-modal');
  await expect(removeConditionsModal).toBeVisible();
  await expect(removeConditionsModal).toContainText('Conditions will be removed');
  await expect(removeConditionsModal).toContainText('Marking this instance as primary will remove all conditions');
  const cancel = removeConditionsModal.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeVisible();
  const removeConditionsButton = removeConditionsModal.getByRole('button', { name: 'Remove conditions' });
  await expect(removeConditionsButton).toBeVisible();
  await removeConditionsButton.click();

  makePrimaryButton = page.getByTestId('header-make-primary-btn');
  await expect(makePrimaryButton).toBeHidden();

  const sidebarClose = page.getByTestId('sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, /Mailjet Integration.*Development/);
});

test('should update the mailjet integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  let providerName = page.getByTestId('provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();
  await expect(updateProviderSidebar).toContainText('Set up credentials to start sending notifications.');

  const integrationChannel = page.getByTestId('provider-instance-channel');
  await expect(integrationChannel).toContainText('Email');

  const integrationEnvironment = page.getByTestId('provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const isActive = page.getByTestId('is_active_id');
  await expect(isActive).toHaveValue('true');

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await expect(providerName).toHaveValue('Mailjet Integration');

  const identifier = page.getByTestId('provider-instance-identifier');
  await expect(identifier).toHaveValue(/mailjet/);

  const updateButton = page.getByTestId('update-provider-sidebar-update');
  await expect(updateButton).toBeDisabled();

  await providerName.clear();
  await providerName.fill('Mailjet Integration Updated');

  const apiKey = page.getByTestId('apiKey');
  await apiKey.fill('fake-api-key');

  const secretKey = page.getByTestId('secretKey');
  await secretKey.fill('fake-secret-key');

  const fromField = page.getByTestId('from');
  await fromField.fill('info@novu.co');

  const senderName = page.getByTestId('senderName');
  await senderName.fill('Novu');

  const toastClose = page.locator('.mantine-Notification-closeButton');
  await toastClose.click();

  await expect(updateButton).toBeEnabled();
  await updateButton.click();
  await expect(updateButton).toBeDisabled();

  const sidebarClose = page.getByTestId('sidebar-close');
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

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  let providerName = page.getByTestId('provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  let updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  let sidebarClose = page.getByTestId('sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, 'Mailjet Integration');

  updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const isActive = page.getByTestId('is_active_id');
  await expect(isActive).toHaveValue('true');

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await expect(providerName).toHaveValue('Mailjet Integration');

  const identifier = page.getByTestId('provider-instance-identifier');
  await expect(identifier).toHaveValue(/mailjet/);

  const updateButton = page.getByTestId('update-provider-sidebar-update');
  await expect(updateButton).toBeDisabled();

  providerName = updateProviderSidebar.getByPlaceholder('Enter instance name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration Updated');

  const apiKey = page.getByTestId('apiKey');
  await apiKey.fill('fake-api-key');

  const secretKey = page.getByTestId('secretKey');
  await secretKey.fill('fake-secret-key');

  const fromField = page.getByTestId('from');
  await fromField.fill('info@novu.co');

  const senderName = page.getByTestId('senderName');
  await senderName.fill('Novu');

  const toastClose = page.locator('.mantine-Notification-closeButton');
  await toastClose.click();

  await expect(updateButton).toBeEnabled();
  await updateButton.click();
  await expect(updateButton).toBeDisabled();

  sidebarClose = page.getByTestId('sidebar-close');
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

  const addProvider = page.getByTestId('add-provider');
  await expect(addProvider).toBeEnabled();
  await addProvider.click();

  const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
  await expect(selectProviderSidebar).toBeVisible();

  const mailjet = page.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`);
  await expect(mailjet).toContainText('Mailjet');
  await mailjet.click();

  const next = page.getByTestId('select-provider-sidebar-next');
  await expect(next).toContainText('Next');
  await next.click();

  const providerName = page.getByTestId('provider-instance-name');
  await providerName.clear();
  await providerName.fill('Mailjet Integration');

  const create = page.getByTestId('create-provider-instance-sidebar-create');
  await expect(create).toContainText('Create');
  await expect(create).toBeEnabled();
  await create.click();

  let updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const sidebarClose = page.getByTestId('sidebar-close');
  await sidebarClose.click();

  await clickOnListRow(page, 'Mailjet Integration');

  updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const menu = updateProviderSidebar.locator('[aria-haspopup="menu"]');
  await menu.click();
  const deleteButton = updateProviderSidebar.locator('button[data-menu-item="true"]', { hasText: 'Delete' });
  await deleteButton.click();

  const deleteModal = page.getByTestId('delete-provider-instance-modal');
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

  const integrationsTable = page.getByTestId('integration-name-cell').getByText('Mailjet Integration');
  await expect(integrationsTable).toBeHidden();
});

test('should show the Novu in-app integration', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, /Novu Inbox.*Development/);

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();
  await expect(updateProviderSidebar).toContainText(
    'Select a framework to set up credentials to start sending notifications.'
  );

  const sidebarClose = page.getByTestId('sidebar-close');
  await expect(sidebarClose).toBeVisible();

  const integrationChannel = page.getByTestId('provider-instance-channel');
  await expect(integrationChannel).toContainText('In-App');

  const integrationEnvironment = page.getByTestId('provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const linkToDocs = updateProviderSidebar.getByRole('link', { name: 'Explore set-up guide' });
  await expect(linkToDocs).toBeVisible();

  const isActive = page.getByTestId('is_active_id');
  await expect(isActive).toHaveValue('true');

  const isDarkThemeEnabled = await isDarkTheme(page);
  const selectedProviderImage = page.getByTestId(`selected-provider-image-${InAppProviderIdEnum.Novu}`);
  await expect(selectedProviderImage).toHaveAttribute(
    'src',
    `/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${InAppProviderIdEnum.Novu}.svg`
  );

  const selectedProviderName = page.getByTestId('provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu Inbox');

  const identifier = page.getByTestId('provider-instance-identifier');
  await expect(identifier).toHaveValue(/novu-in-app/);

  const hmacCheckbox = page.getByTestId('hmac');
  await expect(hmacCheckbox).not.toBeChecked();

  const novuInAppFrameworks = page.getByTestId('novu-in-app-frameworks');
  await expect(novuInAppFrameworks).toContainText('Integrate In-App using a framework below');
  await expect(novuInAppFrameworks).toContainText('React');
  await expect(novuInAppFrameworks).toContainText('Angular');
  await expect(novuInAppFrameworks).toContainText('Web Component');
  await expect(novuInAppFrameworks).toContainText('Headless');
  await expect(novuInAppFrameworks).toContainText('Vue');
  await expect(novuInAppFrameworks).toContainText('iFrame');

  const updateButton = page.getByTestId('update-provider-sidebar-update');
  await expect(updateButton).toContainText('Update');
  await expect(updateButton).toBeDisabled();
});

test('should show the Novu in-app integration - React guide', async ({ page }) => {
  await page.goto('/integrations');
  await expect(page).toHaveURL(/\/integrations/);

  await clickOnListRow(page, /Novu Inbox.*Development/);

  let updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toBeVisible();

  const novuInAppFrameworks = page.getByTestId('novu-in-app-frameworks');
  await expect(novuInAppFrameworks).toContainText('React');

  const reactGuide = novuInAppFrameworks.locator('div').filter({ hasText: 'React' }).nth(1);
  await reactGuide.click();

  updateProviderSidebar = page.getByTestId('update-provider-sidebar');
  await expect(updateProviderSidebar).toContainText('React integration guide');

  const sidebarBack = page.getByTestId('sidebar-back');
  await expect(sidebarBack).toBeVisible();
  const setupTimeline = page.getByTestId('setup-timeline');
  await expect(setupTimeline).toBeVisible();

  const updateButton = page.getByTestId('update-provider-sidebar-update');
  await expect(updateButton).toContainText('Update');
  await expect(updateButton).toBeDisabled();
});

test('should show the Novu Email integration sidebar', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
    modifyBody: (body) => {
      const [firstIntegration] = body.data;
      // eslint-disable-next-line no-param-reassign
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

  await clickOnListRow(page, /Novu Email.*Development/);

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar-novu');
  await expect(updateProviderSidebar).toContainText('Test Provider');
  await expect(updateProviderSidebar).toBeVisible();

  const isDarkThemeEnabled = await isDarkTheme(page);
  const novuEmailLogo = updateProviderSidebar.locator(
    `img[src="/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${
      EmailProviderIdEnum.Novu
    }.svg"]`
  );
  await expect(novuEmailLogo).toBeVisible();

  const integrationChannel = page.getByTestId('provider-instance-channel');
  await expect(integrationChannel).toContainText('Email');

  const integrationEnvironment = page.getByTestId('provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const selectedProviderName = page.getByTestId('provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu Email');

  const providerLimits = page.getByTestId('novu-provider-limits');
  const providerLimitsText = await providerLimits.innerText();
  await expect(providerLimitsText).toEqual(
    'Novu provider allows sending max 300 emails per month,\nto send more messages, configure a different provider'
  );

  const limitbarLimit = page.getByTestId('limitbar-limit');
  const limitbarText = await limitbarLimit.innerText();
  await expect(limitbarText).toEqual('300 emails per month');
});

test('should show the Novu SMS integration sidebar', async ({ page }) => {
  const integrationsPromise = interceptIntegrationsRequest({
    page,
    modifyBody: (body) => {
      const [firstIntegration] = body.data;
      // eslint-disable-next-line no-param-reassign
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

  await clickOnListRow(page, /Novu SMS.*Development/);

  const updateProviderSidebar = page.getByTestId('update-provider-sidebar-novu');
  await expect(updateProviderSidebar).toContainText('Test Provider');
  await expect(updateProviderSidebar).toBeVisible();

  const isDarkThemeEnabled = await isDarkTheme(page);
  const novuEmailLogo = updateProviderSidebar.locator(
    `img[src="/static/images/providers/${isDarkThemeEnabled ? 'dark' : 'light'}/square/${SmsProviderIdEnum.Novu}.svg"]`
  );
  await expect(novuEmailLogo).toBeVisible();

  const integrationChannel = page.getByTestId('provider-instance-channel');
  await expect(integrationChannel).toContainText('SMS');

  const integrationEnvironment = page.getByTestId('provider-instance-environment');
  await expect(integrationEnvironment).toContainText('Development');

  const selectedProviderName = page.getByTestId('provider-instance-name').first();
  await expect(selectedProviderName).toBeVisible();
  await expect(selectedProviderName).toHaveValue('Novu SMS');

  const providerLimits = page.getByTestId('novu-provider-limits');
  const providerLimitsText = await providerLimits.innerText();
  await expect(providerLimitsText).toEqual(
    'Novu provider allows sending max 20 messages per month,\nto send more messages, configure a different provider'
  );

  const limitbarLimit = page.getByTestId('limitbar-limit');
  const limitbarText = await limitbarLimit.innerText();
  await expect(limitbarText).toEqual('20 messages per month');
});

type PrimaryToggleButtonTest = {
  channelType: ChannelTypeEnum;
  providerId: ProvidersIdEnum;
  providerName: string;
  enabled: boolean;
};

const testCases: PrimaryToggleButtonTest[] = [
  {
    channelType: ChannelTypeEnum.SMS,
    providerId: SmsProviderIdEnum.Twilio,
    providerName: 'Twilio',
    enabled: true,
  },
  {
    channelType: ChannelTypeEnum.EMAIL,
    providerId: EmailProviderIdEnum.Mailjet,
    providerName: 'Mailjet',
    enabled: true,
  },
  {
    channelType: ChannelTypeEnum.CHAT,
    providerId: ChatProviderIdEnum.Discord,
    providerName: 'Discord',
    enabled: false,
  },
  {
    channelType: ChannelTypeEnum.PUSH,
    providerId: PushProviderIdEnum.FCM,
    providerName: 'Firebase',
    enabled: false,
  },
];

testCases.forEach((testCase) => {
  test(`should ${testCase.enabled ? 'show' : 'NOT show'} the primary toggle button for ${
    testCase.providerName
  }`, async ({ page }) => {
    await page.goto('/integrations');
    await expect(page).toHaveURL(/\/integrations/);

    const addProvider = page.getByTestId('add-provider');
    await expect(addProvider).toBeEnabled();
    await addProvider.click();

    const selectProviderSidebar = page.getByTestId('select-provider-sidebar');
    await expect(selectProviderSidebar).toBeVisible();

    const mailjet = page.getByTestId(`provider-${testCase.providerId}`);
    await expect(mailjet).toContainText(testCase.providerName);
    await mailjet.click();

    const next = page.getByTestId('select-provider-sidebar-next');
    await expect(next).toContainText('Next');
    await next.click();

    const providerName = page.getByTestId('provider-instance-name');
    await providerName.clear();
    await providerName.fill(`${testCase.providerName} Integration`);

    const create = page.getByTestId('create-provider-instance-sidebar-create');
    await expect(create).toContainText('Create');
    await expect(create).toBeEnabled();
    await create.click();

    await expect(page.getByTestId('header-make-primary-btn')).toBeVisible({ visible: testCase.enabled });
  });
});
