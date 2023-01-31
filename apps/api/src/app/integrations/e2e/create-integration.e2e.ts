import { IntegrationRepository, IntegrationEntity } from '@novu/dal';
import { NOVU_START_PROVIDERS } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Create Integration - /integration (POST)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create the email integration successfully', async function () {
    const integration = (await session.testAgent.get(`/v1/integrations`)).body.data.find(
      (searchIntegration) => searchIntegration.channel === 'email'
    );

    expect(integration.providerId).to.equal('sendgrid');
    expect(integration.channel).to.equal('email');
    expect(integration.credentials.apiKey).to.equal('SG.123');
    expect(integration.credentials.secretKey).to.equal('abc');
    expect(integration.active).to.equal(true);
  });

  it('should create the sms integration successfully', async function () {
    const integration = (await session.testAgent.get(`/v1/integrations`)).body.data.find(
      (searchIntegration) => searchIntegration.channel === 'sms'
    );

    expect(integration.providerId).to.equal('twilio');
    expect(integration.channel).to.equal('sms');
    expect(integration.credentials.accountSid).to.equal('AC123');
    expect(integration.credentials.token).to.equal('123');
    expect(integration.active).to.equal(true);
  });

  it('should create the sms and email integration successfully', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    expect(integrations.length).to.equal(5);

    const emailIntegration = integrations.find((i) => i.channel.toString() === 'email');
    const smsIntegration = integrations.find((i) => i.channel.toString() === 'sms');

    expect(emailIntegration).to.be.ok;
    expect(smsIntegration).to.be.ok;
  });

  it('should return error on creation of same provider on same environment twice', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'email',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const secondInsertResponse = await insertIntegrationTwice(session, payload, false);

    expect(secondInsertResponse.body.message).to.contain('Duplicate key');
  });

  it('should fail due missing param', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'email',
      active: true,
      check: false,
    };

    const body = (await session.testAgent.post('/v1/integrations').send(payload)).body.data as IntegrationEntity;

    expect(body).to.equal(undefined);
  });

  it('should deactivated old providers', async function () {
    const payload = {
      providerId: 'mailgun',
      channel: 'email',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const environmentId = (await session.testAgent.get(`/v1/integrations`)).body.data[0]._environmentId;

    await session.testAgent.post('/v1/integrations').send(payload);

    const integrations = await integrationRepository.findByEnvironmentId(environmentId);

    const firstIntegration = integrations.find((i) => i.providerId.toString() === 'sendgrid');
    const secondIntegration = integrations.find((i) => i.providerId.toString() === 'mailgun');

    expect(firstIntegration.active).to.equal(false);
    expect(secondIntegration.active).to.equal(true);
  });
  it('should create starting/free providers, but ignore passed limits and set default limits', async function () {
    const startProvider = NOVU_START_PROVIDERS.entries().next().value;
    const payload = {
      providerId: startProvider[0],
      channel: startProvider[1].channel,
      credentials: { senderName: 'Test sender name' },
      limits: { softLimit: 9000, hardLimit: 100000 },
      active: true,
      check: false,
    };
    // create integrations
    await session.testAgent.post('/v1/integrations').send(payload);

    const integration = (await session.testAgent.get(`/v1/integrations`)).body.data.find(
      (intr) => intr.providerId === payload.providerId
    );
    expect(integration.active).to.equal(true);
    expect(integration.credentials.senderName).to.equal(payload.credentials.senderName);
    expect(integration.limits.softLimit).to.equal(startProvider[1].limits.softLimit);
    expect(integration.limits.hardLimit).to.equal(startProvider[1].limits.hardLimit);
  });
});

async function insertIntegrationTwice(
  session: UserSession,
  payload: { credentials: { apiKey: string; secretKey: string }; providerId: string; channel: string; active: boolean },
  createDiffChannels: boolean
) {
  await session.testAgent.post('/v1/integrations').send(payload);

  if (createDiffChannels) {
    // eslint-disable-next-line no-param-reassign
    payload.channel = 'sms';
  }

  return await session.testAgent.post('/v1/integrations').send(payload);
}
