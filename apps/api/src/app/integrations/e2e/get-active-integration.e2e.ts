import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { IntegrationService } from '@novu/testing';
import { IntegrationEntity } from '@novu/dal';

describe('Get Active Integrations - Multi-Provider Configuration - /integrations/active (GET)', function () {
  let session: UserSession;
  const integrationService = new IntegrationService();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    process.env.LAUNCH_DARKLY_SDK_KEY = '';
  });

  it('should get active integrations', async function () {
    await integrationService.createIntegration({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
    });
    await integrationService.createIntegration({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      providerId: SmsProviderIdEnum.Twilio,
      channel: ChannelTypeEnum.SMS,
    });

    const activeIntegrations: IntegrationEntity[] = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    const { inAppIntegration, emailIntegration, smsIntegration, chatIntegration, pushIntegration } =
      splitByChannels(activeIntegrations);

    expect(inAppIntegration.length).to.equal(2);
    expect(emailIntegration.length).to.equal(3);
    expect(smsIntegration.length).to.equal(3);
    expect(pushIntegration.length).to.equal(2);
    expect(chatIntegration.length).to.equal(4);

    const selectedInAppIntegrations = filterEnvIntegrations(inAppIntegration, session.environment._id);
    expect(selectedInAppIntegrations.length).to.equal(0);

    const selectedEmailIntegrations = filterEnvIntegrations(emailIntegration, session.environment._id);
    expect(selectedEmailIntegrations.length).to.equal(1);

    const selectedSmsIntegrations = filterEnvIntegrations(smsIntegration, session.environment._id);
    expect(selectedSmsIntegrations.length).to.equal(1);

    const selectedPushIntegrations = filterEnvIntegrations(pushIntegration, session.environment._id);
    expect(selectedPushIntegrations.length).to.equal(0);

    const selectedChatIntegrations = filterEnvIntegrations(chatIntegration, session.environment._id);
    expect(selectedChatIntegrations.length).to.equal(0);

    for (const integration of activeIntegrations) {
      expect(integration.active).to.equal(true);
    }
  });

  it('should have return empty array if no active integration are exist', async function () {
    await integrationService.deleteAllForOrganization(session.organization._id);
    const response = await session.testAgent.get(`/v1/integrations/active`);

    const normalizeIntegration = response.body.data.filter((integration) => !integration.providerId.includes('novu'));

    expect(normalizeIntegration.length).to.equal(0);
  });

  it('should have additional unselected integration after creating a new one', async function () {
    const initialActiveIntegrations: IntegrationEntity[] = (await session.testAgent.get(`/v1/integrations/active`)).body
      .data;
    const { emailIntegration: initialEmailIntegrations } = splitByChannels(initialActiveIntegrations);

    let allOrgSelectedIntegrations = initialEmailIntegrations.filter((integration) => integration.primary);
    let allEnvSelectedIntegrations = filterEnvIntegrations(initialEmailIntegrations, session.environment._id);
    let allEnvNotSelectedIntegrations = filterEnvIntegrations(initialEmailIntegrations, session.environment._id, false);

    expect(allOrgSelectedIntegrations.length).to.equal(2);
    expect(allEnvSelectedIntegrations.length).to.equal(1);
    expect(allEnvNotSelectedIntegrations.length).to.equal(0);

    await integrationService.createIntegration({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      providerId: EmailProviderIdEnum.SES,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    const activeIntegrations: IntegrationEntity[] = (await session.testAgent.get(`/v1/integrations/active`)).body.data;
    const { emailIntegration } = splitByChannels(activeIntegrations);

    allOrgSelectedIntegrations = emailIntegration.filter((integration) => integration.primary);
    allEnvSelectedIntegrations = filterEnvIntegrations(emailIntegration, session.environment._id);
    allEnvNotSelectedIntegrations = filterEnvIntegrations(emailIntegration, session.environment._id, false);

    expect(allOrgSelectedIntegrations.length).to.equal(2);
    expect(allEnvSelectedIntegrations.length).to.equal(1);
    expect(allEnvNotSelectedIntegrations.length).to.equal(1);
  });
});

function filterEnvIntegrations(integrations: IntegrationEntity[], environmentId: string, primary = true) {
  return integrations.filter(
    (integration) => integration.primary === primary && integration._environmentId === environmentId
  );
}

function splitByChannels(activeIntegrations: IntegrationEntity[]) {
  return activeIntegrations.reduce<{
    inAppIntegration: IntegrationEntity[];
    emailIntegration: IntegrationEntity[];
    smsIntegration: IntegrationEntity[];
    chatIntegration: IntegrationEntity[];
    pushIntegration: IntegrationEntity[];
  }>(
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
