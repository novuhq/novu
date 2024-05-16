import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  FieldOperatorEnum,
  InAppProviderIdEnum,
  ITenantFilterPart,
  PushProviderIdEnum,
} from '@novu/shared';

describe('Update Integration - /integrations/:integrationId (PUT)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const envRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw not found exception when integration is not found', async function () {
    const integrationId = IntegrationRepository.createObjectId();
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'new_key', secretKey: 'new_secret' },
      active: true,
      check: false,
    };

    const { body } = await session.testAgent.put(`/v1/integrations/${integrationId}`).send(payload);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.equal(`Entity with id ${integrationId} not found`);
  });

  it('should update newly created integration', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'new_key', secretKey: 'new_secret' },
      active: true,
      check: false,
    };

    payload.credentials = { apiKey: 'new_key', secretKey: 'new_secret' };

    const integrationId = (await session.testAgent.get(`/v1/integrations`)).body.data.find(
      (integration) => integration.channel === 'email'
    )._id;

    // update integration
    await session.testAgent.put(`/v1/integrations/${integrationId}`).send(payload);

    const integration = (await session.testAgent.get(`/v1/integrations`)).body.data.find(
      (fetchedIntegration) => fetchedIntegration._id === integrationId
    );

    expect(integration.credentials.apiKey).to.equal(payload.credentials.apiKey);
    expect(integration.credentials.secretKey).to.equal(payload.credentials.secretKey);
  });

  it('should update conditions on integration', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'SG.123', secretKey: 'abc' },
      active: true,
      check: false,
      conditions: [
        {
          children: [{ field: 'identifier', value: 'test', operator: FieldOperatorEnum.EQUAL, on: 'tenant' }],
        },
      ],
    };

    const data = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const integration = data.find((i) => i.primary && i.channel === 'email');

    expect(integration.conditions.length).to.equal(0);

    await session.testAgent.put(`/v1/integrations/${integration._id}`).send(payload);

    const result = await integrationRepository.findOne({
      _id: integration._id,
      _organizationId: session.organization._id,
    });

    expect(result?.conditions?.length).to.equal(1);
    expect(result?.primary).to.equal(false);
    expect(result?.conditions?.at(0)?.children.length).to.equal(1);
    expect(result?.conditions?.at(0)?.children.at(0)?.on).to.equal('tenant');
    expect((result?.conditions?.at(0)?.children.at(0) as ITenantFilterPart)?.field).to.equal('identifier');
    expect((result?.conditions?.at(0)?.children.at(0) as ITenantFilterPart)?.value).to.equal('test');
    expect((result?.conditions?.at(0)?.children.at(0) as ITenantFilterPart)?.operator).to.equal('EQUAL');
  });

  it('should return error with malformed conditions', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: 'SG.123', secretKey: 'abc' },
      active: true,
      check: false,
      conditions: [
        {
          children: 'test',
        },
      ],
    };

    const data = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const integration = data.find((i) => i.primary && i.channel === 'email');

    expect(integration.conditions.length).to.equal(0);

    const { body } = await session.testAgent.put(`/v1/integrations/${integration._id}`).send(payload);

    expect(body.statusCode).to.equal(400);
    expect(body.error).to.equal('Bad Request');
  });

  it('should not allow to update the integration with same identifier', async function () {
    const identifier2 = 'identifier2';
    const integrationOne = await integrationRepository.create({
      name: 'Test1',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    await integrationRepository.create({
      name: 'Test2',
      identifier: identifier2,
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    const payload = {
      identifier: identifier2,
      check: false,
    };

    const { body } = await session.testAgent.put(`/v1/integrations/${integrationOne._id}`).send(payload);

    expect(body.statusCode).to.equal(409);
    expect(body.message).to.equal('Integration with identifier already exists');
  });

  it('should allow updating the integration with just identifier', async function () {
    const integrationOne = await integrationRepository.create({
      name: 'Test',
      identifier: 'identifier',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      identifier: 'identifier2',
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integrationOne._id}`).send(payload);

    expect(data.identifier).to.eq(payload.identifier);
  });

  it('should allow updating the integration with just name', async function () {
    const integrationOne = await integrationRepository.create({
      name: 'Test',
      identifier: 'identifier',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      name: 'Test2',
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integrationOne._id}`).send(payload);

    expect(data.name).to.eq(payload.name);
  });

  it('should allow updating the integration with just environment', async function () {
    const integrationOne = await integrationRepository.create({
      name: 'Test',
      identifier: 'identifier',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });
    const prodEnv = await envRepository.findOne({ name: 'Production', _organizationId: session.organization._id });
    const payload = {
      _environmentId: prodEnv?._id,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integrationOne._id}`).send(payload);

    expect(data._environmentId).to.equal(prodEnv?._id);
  });

  it('should update custom SMTP integration with TLS options successfully', async function () {
    const nodeMailerProviderPayload = {
      providerId: 'nodemailer',
      channel: 'email',
      credentials: {
        host: 'smtp.example.com',
        port: '587',
        secure: true,
        requireTls: true,
        tlsOptions: { rejectUnauthorized: false },
      },
      active: true,
      check: false,
    };

    // create integration
    const nodeMailerIntegrationId = (await session.testAgent.post('/v1/integrations').send(nodeMailerProviderPayload))
      .body.data._id;

    // update integration
    const updatedNodeMailerProviderPayload = {
      providerId: 'nodemailer',
      channel: 'email',
      credentials: {
        host: 'smtp.example.com',
        port: '587',
        secure: true,
        requireTls: false,
        tlsOptions: { rejectUnauthorized: false, enableTrace: true },
      },
      active: true,
      check: false,
    };
    await session.testAgent.put(`/v1/integrations/${nodeMailerIntegrationId}`).send(updatedNodeMailerProviderPayload);

    const integrations = await integrationRepository.findByEnvironmentId(session.environment._id);

    const nodeMailerIntegration = integrations.find((i) => i.providerId.toString() === 'nodemailer');

    expect(nodeMailerIntegration?.credentials?.host).to.equal(updatedNodeMailerProviderPayload.credentials.host);
    expect(nodeMailerIntegration?.credentials?.port).to.equal(updatedNodeMailerProviderPayload.credentials.port);
    expect(nodeMailerIntegration?.credentials?.secure).to.equal(updatedNodeMailerProviderPayload.credentials.secure);
    expect(nodeMailerIntegration?.credentials?.requireTls).to.equal(
      updatedNodeMailerProviderPayload.credentials.requireTls
    );
    expect(nodeMailerIntegration?.credentials?.tlsOptions).to.instanceOf(Object);
    expect(nodeMailerIntegration?.credentials?.tlsOptions).to.eql(
      updatedNodeMailerProviderPayload.credentials.tlsOptions
    );
    expect(nodeMailerIntegration?.active).to.equal(true);
  });

  it('should not calculate primary and priority if active is not defined', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const emailIntegration = await integrationRepository.create({
      name: 'SendGrid',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      name: 'SendGrid Email',
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${emailIntegration._id}`).send(payload);

    expect(data.name).to.equal('SendGrid Email');
    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(false);
  });

  it('should not calculate primary and priority if active not changed', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const emailIntegration = await integrationRepository.create({
      name: 'SendGrid Email',
      identifier: 'identifier1',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: false,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${emailIntegration._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(false);
  });

  it('should not calculate primary and priority fields for in-app channel', async function () {
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

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${inAppIntegration._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not calculate primary and priority fields for push channel', async function () {
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

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${pushIntegration._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not calculate primary and priority fields for chat channel', async function () {
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

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${chatIntegration._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not set the primary if there are no other active integrations', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integration._id}`).send(payload);

    expect(data.priority).to.equal(1);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not set the primary if there is only Novu active integration', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const novuEmail = await integrationRepository.create({
      name: 'novuEmail',
      identifier: 'novuEmail',
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integration._id}`).send(payload);

    expect(data.priority).to.equal(1);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);

    const [first, second] = await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(novuEmail._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(integration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should calculate the highest priority but not set primary if there is another active integration', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const firstActiveIntegration = await integrationRepository.create({
      name: 'firstActiveIntegration',
      identifier: 'firstActiveIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const secondActiveIntegration = await integrationRepository.create({
      name: 'secondActiveIntegration',
      identifier: 'secondActiveIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${secondActiveIntegration._id}`).send(payload);

    expect(data.priority).to.equal(2);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(secondActiveIntegration._id);
    expect(first.primary).to.equal(false);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(firstActiveIntegration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should calculate the priority but not higher than the primary integration', async function () {
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

    const integration = await integrationRepository.create({
      name: 'integration',
      identifier: 'integration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${integration._id}`).send(payload);

    expect(data.priority).to.equal(3);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);

    const [first, second, third, fourth, fifth] = await await integrationRepository.find(
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
    expect(first.priority).to.equal(4);

    expect(second._id).to.equal(integration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(3);

    expect(third._id).to.equal(activeIntegrationOne._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(true);
    expect(third.priority).to.equal(2);

    expect(fourth._id).to.equal(activeIntegrationTwo._id);
    expect(fourth.primary).to.equal(false);
    expect(fourth.active).to.equal(true);
    expect(fourth.priority).to.equal(1);

    expect(fifth._id).to.equal(inactiveIntegration._id);
    expect(fifth.primary).to.equal(false);
    expect(fifth.active).to.equal(false);
    expect(fifth.priority).to.equal(0);
  });

  it('should recalculate the priority when integration is deactivated', async function () {
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

    const payload = {
      active: false,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${activeIntegrationOne._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(false);

    const [first, second, third, fourth] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1, createdAt: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(activeIntegrationTwo._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);

    expect(third._id).to.equal(inactiveIntegration._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(false);
    expect(third.priority).to.equal(0);

    expect(fourth._id).to.equal(activeIntegrationOne._id);
    expect(fourth.primary).to.equal(false);
    expect(fourth.active).to.equal(false);
    expect(fourth.priority).to.equal(0);
  });

  it('should recalculate the priority when the primary integration is deactivated', async function () {
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

    const payload = {
      active: false,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${primaryIntegration._id}`).send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(false);

    const [first, second, third, fourth] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1, createdAt: -1 } }
    );

    expect(first._id).to.equal(activeIntegrationOne._id);
    expect(first.primary).to.equal(false);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(activeIntegrationTwo._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);

    expect(third._id).to.equal(inactiveIntegration._id);
    expect(third.primary).to.equal(false);
    expect(third.active).to.equal(false);
    expect(third.priority).to.equal(0);

    expect(fourth._id).to.equal(primaryIntegration._id);
    expect(fourth.primary).to.equal(false);
    expect(fourth.active).to.equal(false);
    expect(fourth.priority).to.equal(0);
  });

  it('should not disable the novu integration and clear the primary flag if the integration is updated', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const novuIntegration = await integrationRepository.create({
      name: 'Novu Integration',
      identifier: 'novuIntegration',
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const activeIntegration = await integrationRepository.create({
      name: 'activeIntegration',
      identifier: 'activeIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      primary: false,
      priority: 0,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.put(`/v1/integrations/${activeIntegration._id}`).send(payload);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1, createdAt: -1 } }
    );

    expect(first._id).to.equal(novuIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(data._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });
});
