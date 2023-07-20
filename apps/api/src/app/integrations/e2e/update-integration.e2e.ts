import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

const ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;

describe('Update Integration - /integrations/:integrationId (PUT)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const envRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';
  });

  afterEach(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = ORIGINAL_IS_MULTI_PROVIDER_CONFIGURATION_ENABLED;
  });

  it('should update newly created integration', async function () {
    const payload = {
      providerId: 'sendgrid',
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

    const integration = (await session.testAgent.get(`/v1/integrations`)).body.data[0];

    expect(integration.credentials.apiKey).to.equal(payload.credentials.apiKey);
    expect(integration.credentials.secretKey).to.equal(payload.credentials.secretKey);
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
});
