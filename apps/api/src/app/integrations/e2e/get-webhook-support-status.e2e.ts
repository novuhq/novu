import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

describe('Get Webhook Support Status - /webhook/provider/:providerOrIntegrationId/status (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  const checkBadRequestIntegration = async (integration: IntegrationEntity, message: string) => {
    const { body } = await session.testAgent.get(`/v1/integrations/webhook/provider/${integration._id}/status`);
    expect(body.statusCode).to.equal(400);
    expect(body.error).to.equal('Bad Request');
    expect(body.message).to.equal(message);
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
  });

  it("should throw not found error when integration doesn't exist", async () => {
    const notExistingIntegrationId = IntegrationRepository.createObjectId();

    const { body } = await session.testAgent.get(
      `/v1/integrations/webhook/provider/${notExistingIntegrationId}/status`
    );
    expect(body.statusCode).to.equal(404);
    expect(body.error).to.equal('Not Found');
    expect(body.message).to.equal(`Integration for ${notExistingIntegrationId} was not found`);
  });

  it("should throw bad request error when integration doesn't have credentials", async () => {
    const integration = await integrationRepository.create({
      name: 'Test',
      identifier: 'sendgrid',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    await checkBadRequestIntegration(integration, `Integration ${integration._id} doesn't have credentials set up`);
  });

  it('should throw bad request error for chat, push, in-app integrations', async () => {
    const slackIntegration = await integrationRepository.create({
      name: 'Slack',
      identifier: 'slack',
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      active: true,
      credentials: {
        apiKey: '',
      },
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    await checkBadRequestIntegration(
      slackIntegration,
      `Webhook for ${slackIntegration.providerId}-${slackIntegration.channel} is not supported yet`
    );

    const fcmIntegration = await integrationRepository.create({
      name: 'FCM',
      identifier: 'push',
      providerId: PushProviderIdEnum.FCM,
      channel: ChannelTypeEnum.PUSH,
      active: true,
      credentials: {
        apiKey: '',
      },
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    await checkBadRequestIntegration(
      fcmIntegration,
      `Webhook for ${fcmIntegration.providerId}-${fcmIntegration.channel} is not supported yet`
    );

    const novuIntegration = await integrationRepository.create({
      name: 'Novu',
      identifier: 'novu',
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
      credentials: {
        apiKey: '',
      },
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    await checkBadRequestIntegration(
      novuIntegration,
      `Webhook for ${novuIntegration.providerId}-${novuIntegration.channel} is not supported yet`
    );
  });

  it('should return true if provider supports parsing events', async () => {
    const integration = await integrationRepository.create({
      name: 'Test',
      identifier: 'sendgrid',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      credentials: {
        apiKey: '',
      },
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { body, statusCode } = await session.testAgent.get(
      `/v1/integrations/webhook/provider/${integration._id}/status`
    );
    expect(statusCode).to.equal(200);
    expect(body.data).to.equal(true);
  });

  it("should return false if provider doesn't support parsing events", async () => {
    const integration = await integrationRepository.create({
      name: 'AfricasTalking',
      identifier: 'africastalking',
      providerId: SmsProviderIdEnum.AfricasTalking,
      channel: ChannelTypeEnum.SMS,
      active: true,
      credentials: {
        apiKey: 'asdf',
        user: 'asdf',
        from: 'asdf',
      },
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { body, statusCode } = await session.testAgent.get(
      `/v1/integrations/webhook/provider/${integration._id}/status`
    );
    expect(statusCode).to.equal(200);
    expect(body.data).to.equal(false);
  });
});
