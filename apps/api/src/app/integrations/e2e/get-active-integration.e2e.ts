import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { IntegrationRepository } from '@novu/dal';

describe('Get Active Integrations [IS_MULTI_PROVIDER_CONFIGURATION_ENABLED=true] - /integrations/active (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';
    process.env.LAUNCH_DARKLY_SDK_KEY = '';
  });

  afterEach(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  });

  it('should get active integrations', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    const { inAppIntegration, emailIntegration, smsIntegration, chatIntegration, pushIntegration } =
      splitByChannels(activeIntegrations);

    expect(inAppIntegration.length).to.equal(2);
    expect(emailIntegration.length).to.equal(3);
    expect(smsIntegration.length).to.equal(3);
    expect(pushIntegration.length).to.equal(2);
    expect(chatIntegration.length).to.equal(4);

    expect(inAppIntegration[0].selected).to.equal(true);
    expect(emailIntegration[0].selected).to.equal(true);
    expect(smsIntegration[0].selected).to.equal(true);
    expect(pushIntegration[0].selected).to.equal(true);

    const selected = chatIntegration.filter((integration) => integration.selected);
    const notSelected = chatIntegration.filter((integration) => !integration.selected);

    expect(selected.length).to.equal(2);
    expect(notSelected.length).to.equal(2);
  });

  it('should have return empty array if no active integration are exist', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    await deleteAll(activeIntegrations, integrationRepository, session);
    const response = await session.testAgent.get(`/v1/integrations/active`);

    const normalizeIntegration = response.body.data.filter((integration) => !integration.providerId.includes('novu'));

    expect(normalizeIntegration.length).to.equal(0);
  });

  it('should get addition unselected integration after a new one created', async function () {
    const initialActiveIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    const { emailIntegration: initialEmailIntegrations } = splitByChannels(initialActiveIntegrations);

    const initialSelected = initialEmailIntegrations.filter((integration) => integration.selected);
    const initialNotSelected = initialEmailIntegrations.filter((integration) => !integration.selected);

    expect(initialSelected.length).to.equal(2);
    expect(initialNotSelected.length).to.equal(1);

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.SES,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    const { emailIntegration } = splitByChannels(activeIntegrations);

    expect(emailIntegration.length).to.equal(4);

    const selected = emailIntegration.filter((integration) => integration.selected);
    const notSelected = emailIntegration.filter((integration) => !integration.selected);

    expect(selected.length).to.equal(2);
    expect(notSelected.length).to.equal(2);
  });
});

describe('Get Active Integrations [IS_MULTI_PROVIDER_CONFIGURATION_ENABLED=false] - /integrations/active (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'false';
    process.env.LAUNCH_DARKLY_SDK_KEY = '';
  });

  afterEach(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  });

  it('should get active integrations', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    const { inAppIntegration, emailIntegration, smsIntegration, chatIntegration, pushIntegration } =
      splitByChannels(activeIntegrations);

    expect(inAppIntegration.length).to.equal(1);
    expect(emailIntegration.length).to.equal(1);
    expect(smsIntegration.length).to.equal(1);
    expect(pushIntegration.length).to.equal(1);
    expect(chatIntegration.length).to.equal(2);

    expect(inAppIntegration[0].selected).to.equal(true);
    expect(emailIntegration[0].selected).to.equal(true);
    expect(smsIntegration[0].selected).to.equal(true);
    expect(pushIntegration[0].selected).to.equal(true);

    const selected = chatIntegration.filter((integration) => integration.selected);
    const notSelected = chatIntegration.filter((integration) => !integration.selected);

    expect(selected.length).to.equal(1);
    expect(notSelected.length).to.equal(1);
  });

  it('should have return empty array if no active integration are exist', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    await deleteAll(activeIntegrations, integrationRepository, session);
    const response = await session.testAgent.get(`/v1/integrations/active`);

    expect(response.body.data.length).to.equal(0);
  });

  it('should get addition unselected integration after a new one created', async function () {
    const initialActiveIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    const { emailIntegration: initialEmailIntegrations } = splitByChannels(initialActiveIntegrations);

    const initialSelected = initialEmailIntegrations.filter((integration) => integration.selected);
    const initialNotSelected = initialEmailIntegrations.filter((integration) => !integration.selected);

    expect(initialSelected.length).to.equal(1);
    expect(initialNotSelected.length).to.equal(0);

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.SES,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    const { emailIntegration } = splitByChannels(activeIntegrations);

    expect(emailIntegration.length).to.equal(2);

    const selected = emailIntegration.filter((integration) => integration.selected);
    const notSelected = emailIntegration.filter((integration) => !integration.selected);

    expect(selected.length).to.equal(1);
    expect(notSelected.length).to.equal(1);
  });
});

function splitByChannels(activeIntegrations) {
  return activeIntegrations.reduce(
    (acc, integration) => {
      if (integration.channel === ChannelTypeEnum.IN_APP) {
        acc.inAppIntegration.push(integration);
      } else if (integration.channel === ChannelTypeEnum.EMAIL) {
        acc.emailIntegration.push(integration);
      } else if (integration.channel === ChannelTypeEnum.SMS) {
        acc.smsIntegration.push(integration);
      } else if (integration.channel === ChannelTypeEnum.CHAT) {
        acc.chatIntegration.push(integration);
      } else if (integration.channel === ChannelTypeEnum.PUSH) {
        acc.pushIntegration.push(integration);
      }

      return acc;
    },
    {
      inAppIntegration: [],
      emailIntegration: [],
      smsIntegration: [],
      chatIntegration: [],
      pushIntegration: [],
    }
  );
}

async function deleteAll(activeIntegrations, integrationRepository, session) {
  const environmentsIds = activeIntegrations
    .map((integration) => integration._environmentId)
    .filter((value, index, self) => self.indexOf(value) === index);

  for (const environmentId of environmentsIds) {
    await integrationRepository.deleteMany({
      _environmentId: environmentId,
      _organizationId: session.organization._id,
    });
  }
}
