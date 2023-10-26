import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { IntegrationRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ChatProviderIdEnum,
  PushProviderIdEnum,
} from '@novu/shared';
import { HttpStatus } from '@nestjs/common';

describe('Delete Integration - /integration/:integrationId (DELETE)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw not found exception when integration is not found', async function () {
    const integrationId = IntegrationRepository.createObjectId();
    const { body } = await session.testAgent.delete(`/v1/integrations/${integrationId}`).send();

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.equal(`Entity with id ${integrationId} not found`);
  });

  it('should not recalculate primary and priority fields for in-app channel', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const primaryIntegration = await integrationRepository.create({
      name: 'primaryIntegration',
      identifier: 'primaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const inAppIntegration = await integrationRepository.create({
      name: 'Novu In-App',
      identifier: 'identifier1',
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { statusCode } = await session.testAgent.delete(`/v1/integrations/${inAppIntegration._id}`).send();
    expect(statusCode).to.equal(200);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(integration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should not recalculate primary and priority fields for push channel', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const primaryIntegration = await integrationRepository.create({
      name: 'primaryIntegration',
      identifier: 'primaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const pushIntegration = await integrationRepository.create({
      name: 'FCM',
      identifier: 'identifier1',
      providerId: PushProviderIdEnum.FCM,
      channel: ChannelTypeEnum.PUSH,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { statusCode } = await session.testAgent.delete(`/v1/integrations/${pushIntegration._id}`).send();
    expect(statusCode).to.equal(200);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(integration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should not recalculate primary and priority fields for chat channel', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const primaryIntegration = await integrationRepository.create({
      name: 'primaryIntegration',
      identifier: 'primaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const chatIntegration = await integrationRepository.create({
      name: 'Slack',
      identifier: 'identifier1',
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { statusCode } = await session.testAgent.delete(`/v1/integrations/${chatIntegration._id}`).send();
    expect(statusCode).to.equal(200);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(integration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should recalculate primary and priority fields for email channel', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const primaryIntegration = await integrationRepository.create({
      name: 'primaryIntegration',
      identifier: 'primaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 3,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationOne = await integrationRepository.create({
      name: 'integrationOne',
      identifier: 'integrationOne',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationTwo = await integrationRepository.create({
      name: 'integrationTwo',
      identifier: 'integrationTwo',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { statusCode } = await session.testAgent.delete(`/v1/integrations/${integrationOne._id}`).send();
    expect(statusCode).to.equal(200);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(integrationTwo._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should remove existing integration', async function () {
    const existingIntegrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const developmentEmailIntegration = existingIntegrations.find(
      (integration) =>
        integration.channel === ChannelTypeEnum.EMAIL && session.environment._id === integration._environmentId
    );

    const deletedId = developmentEmailIntegration._id;

    const res = await session.testAgent.delete(`/v1/integrations/${deletedId}`).send();
    expect(res.status).to.equal(HttpStatus.OK);

    const isDeleted = !(await integrationRepository.findOne({
      _environmentId: session.environment._id,
      _id: deletedId,
    }));

    expect(isDeleted).to.equal(true);

    const deletedIntegration = (
      await integrationRepository.findDeleted({
        _environmentId: session.environment._id,
        _id: deletedId,
      })
    )[0];

    expect(deletedIntegration.deleted).to.equal(true);
  });

  it('should remove a newly created integration', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const integration = await session.testAgent.post('/v1/integrations').send(payload);
    expect(integration.status).to.equal(HttpStatus.CREATED);
    const integrationId = integration.body.data._id;

    const res = await session.testAgent.delete(`/v1/integrations/${integrationId}`).send();
    expect(res.status).to.equal(HttpStatus.OK);

    const isDeleted = !(await integrationRepository.findOne({
      _environmentId: session.environment._id,
      _id: integrationId,
    }));

    expect(isDeleted).to.equal(true);

    const deletedIntegration = (
      await integrationRepository.findDeleted({ _environmentId: session.environment._id, _id: integrationId })
    )[0];

    expect(deletedIntegration.deleted).to.equal(true);
  });
});
