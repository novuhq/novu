import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  PushProviderIdEnum,
} from '@novu/shared';

describe('Set Integration As Primary - /integrations/:integrationId/set-primary (POST)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('when integration id is not valid should throw bad request exception', async () => {
    const fakeIntegrationId = 'fakeIntegrationId';

    const { body } = await session.testAgent.post(`/v1/integrations/${fakeIntegrationId}/set-primary`).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message[0]).to.equal(`integrationId must be a mongodb id`);
  });

  it('when integration does not exist should throw not found exception', async () => {
    const fakeIntegrationId = IntegrationRepository.createObjectId();

    const { body } = await session.testAgent.post(`/v1/integrations/${fakeIntegrationId}/set-primary`).send({});

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.equal(`Integration with id ${fakeIntegrationId} not found`);
  });

  it('in-app channel does not support primary flag, then for integration it should throw bad request exception', async () => {
    await integrationRepository.deleteMany({
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

    const { body } = await session.testAgent.post(`/v1/integrations/${inAppIntegration._id}/set-primary`).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(`Channel ${inAppIntegration.channel} does not support primary`);
  });

  it('clears conditions when set as primary', async () => {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'Email with conditions',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      conditions: [{}],
    });

    await session.testAgent.post(`/v1/integrations/${integration._id}/set-primary`).send({});

    const found = await integrationRepository.findOne({
      _id: integration._id,
      _organizationId: session.organization._id,
    });

    expect(found?.conditions).to.deep.equal([]);
    expect(found?.primary).to.equal(true);
  });

  it('push channel does not support primary flag, then for integration it should throw bad request exception', async () => {
    await integrationRepository.deleteMany({
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

    const { body } = await session.testAgent.post(`/v1/integrations/${pushIntegration._id}/set-primary`).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(`Channel ${pushIntegration.channel} does not support primary`);
  });

  it('chat channel does not support primary flag, then for integration it should throw bad request exception', async () => {
    await integrationRepository.deleteMany({
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

    const { body } = await session.testAgent.post(`/v1/integrations/${chatIntegration._id}/set-primary`).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(`Channel ${chatIntegration.channel} does not support primary`);
  });

  it('should not update the primary integration if already is primary', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationOne = await integrationRepository.create({
      name: 'Test1',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${integrationOne._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.priority).to.equal(1);
  });

  it('should set primary and active when there are no other active integrations', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationOne = await integrationRepository.create({
      name: 'Test1',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${integrationOne._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.active).to.equal(true);
    expect(data.priority).to.equal(1);
  });

  it('should set primary and active and update old primary', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const oldPrimaryIntegration = await integrationRepository.create({
      name: 'Test1',
      identifier: 'primaryIdentifier',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationOne = await integrationRepository.create({
      name: 'Test1',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${integrationOne._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.active).to.equal(true);
    expect(data.priority).to.equal(2);

    const updatedOldPrimary = (await integrationRepository.findOne({
      _id: oldPrimaryIntegration._id,
      _environmentId: oldPrimaryIntegration._environmentId,
    })) as IntegrationEntity;

    expect(updatedOldPrimary.primary).to.equal(false);
    expect(updatedOldPrimary.active).to.equal(true);
    expect(updatedOldPrimary.priority).to.equal(1);
  });

  it('should set primary and active and update priority for other active integrations', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const oldPrimaryIntegration = await integrationRepository.create({
      name: 'oldPrimaryIntegration',
      identifier: 'oldPrimaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const activeIntegration = await integrationRepository.create({
      name: 'activeIntegration',
      identifier: 'activeIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const inactiveIntegration = await integrationRepository.create({
      name: 'inactiveIntegration',
      identifier: 'inactiveIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationToSetPrimary = await integrationRepository.create({
      name: 'integrationToSetPrimary',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${integrationToSetPrimary._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.active).to.equal(true);
    expect(data.priority).to.equal(3);

    const [first, second, third, fourth] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(data._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(3);

    expect(second._id).to.equal(oldPrimaryIntegration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(2);

    expect(third._id).to.equal(activeIntegration._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(true);
    expect(third.priority).to.equal(1);

    expect(fourth._id).to.equal(inactiveIntegration._id);
    expect(fourth.primary).to.equal(false);
    expect(fourth.active).to.equal(false);
    expect(fourth.priority).to.equal(0);
  });

  it('should allow set primary for active and recalculate priority for other', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const oldPrimaryIntegration = await integrationRepository.create({
      name: 'oldPrimaryIntegration',
      identifier: 'oldPrimaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 3,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const activeIntegrationOne = await integrationRepository.create({
      name: 'activeIntegrationOne',
      identifier: 'activeIntegrationOne',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 2,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const activeIntegrationTwo = await integrationRepository.create({
      name: 'activeIntegrationTwo',
      identifier: 'activeIntegrationTwo',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${activeIntegrationTwo._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.active).to.equal(true);
    expect(data.priority).to.equal(3);

    const [first, second, third] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(activeIntegrationTwo._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(3);

    expect(second._id).to.equal(oldPrimaryIntegration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(2);

    expect(third._id).to.equal(activeIntegrationOne._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(true);
    expect(third.priority).to.equal(1);
  });

  it('should allow to set primary and do not recalculate priority for all inactive', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const inactiveIntegrationOne = await integrationRepository.create({
      name: 'inactiveIntegrationOne',
      identifier: 'inactiveIntegrationOne',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const inactiveIntegrationTwo = await integrationRepository.create({
      name: 'inactiveIntegrationTwo',
      identifier: 'inactiveIntegrationTwo',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integrationToSetPrimary = await integrationRepository.create({
      name: 'integrationToSetPrimary',
      identifier: 'integrationToSetPrimary',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const {
      body: { data },
    } = await session.testAgent.post(`/v1/integrations/${integrationToSetPrimary._id}/set-primary`).send({});

    expect(data.primary).to.equal(true);
    expect(data.active).to.equal(true);
    expect(data.priority).to.equal(1);

    const [first, second, third] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(integrationToSetPrimary._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(1);

    expect(second._id).to.equal(inactiveIntegrationOne._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(false);
    expect(second.priority).to.equal(0);

    expect(third._id).to.equal(inactiveIntegrationTwo._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(false);
    expect(third.priority).to.equal(0);
  });
});
