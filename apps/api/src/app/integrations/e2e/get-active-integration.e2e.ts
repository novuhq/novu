import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { IntegrationRepository } from '@novu/dal';

describe('Get Active Integrations - /integrations/active (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
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

    const oneSelected = chatIntegration.some((integration) => integration.selected === true);
    const oneNotSelected = chatIntegration.some((integration) => integration.selected === false);

    expect(oneSelected).to.equal(true);
    expect(oneNotSelected).to.equal(true);
  });

  it('should have thrown an exception if no active integration are exist', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    await deleteAll(activeIntegrations, integrationRepository, session);
    const response = await session.testAgent.get(`/v1/integrations/active`);

    expect(response.body.statusCode).to.equal(404);
    expect(response.body.message).to.contain(`No active integrations found for environment ${session.environment._id}`);
  });

  it('should get active newly created integration with selected flag', async function () {
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

    const oneSelected = emailIntegration.some((integration) => integration.selected === true);
    const oneNotSelected = emailIntegration.some((integration) => integration.selected === false);

    expect(oneSelected).to.equal(true);
    expect(oneNotSelected).to.equal(true);
  });
});

function splitByChannels(activeIntegrations) {
  const inAppIntegration = activeIntegrations.filter((integration) => integration.channel === ChannelTypeEnum.IN_APP);
  const emailIntegration = activeIntegrations.filter((integration) => integration.channel === ChannelTypeEnum.EMAIL);
  const smsIntegration = activeIntegrations.filter((integration) => integration.channel === ChannelTypeEnum.SMS);
  const chatIntegration = activeIntegrations.filter((integration) => integration.channel === ChannelTypeEnum.CHAT);
  const pushIntegration = activeIntegrations.filter((integration) => integration.channel === ChannelTypeEnum.PUSH);

  return { inAppIntegration, emailIntegration, smsIntegration, chatIntegration, pushIntegration };
}

async function deleteAll(activeIntegrations, integrationRepository, session) {
  for (const activeIntegration of activeIntegrations) {
    const test = await integrationRepository.delete({
      _id: activeIntegration._id,
      _environmentId: session.environment._id,
    });
  }
}
