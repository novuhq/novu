import { IntegrationRepository, IntegrationEntity } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe('Create Integration - /integration (POST)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create the email integration successfully', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    const body = (await session.testAgent.post('/v1/integrations').send(payload)).body.data as IntegrationEntity;

    const integration = (await integrationRepository.findByApplicationId(body._applicationId))[0];

    expect(integration.providerId).to.equal('sendgrid');
    expect(integration.channel).to.equal('EMAIL');
    expect(integration.credentials.apiKey).to.equal('123');
    expect(integration.credentials.secretKey).to.equal('abc');
    expect(integration.active).to.equal(true);
  });

  it('should create the sms integration successfully', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'SMS',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    const body = (await session.testAgent.post('/v1/integrations').send(payload)).body.data as IntegrationEntity;

    const integration = (await integrationRepository.findByApplicationId(body._applicationId))[0];

    expect(integration.providerId).to.equal('sendgrid');
    expect(integration.channel).to.equal('SMS');
    expect(integration.credentials.apiKey).to.equal('123');
    expect(integration.credentials.secretKey).to.equal('abc');
    expect(integration.active).to.equal(true);
  });

  it('should create the sms and email integration successfully', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    const secondInsertResponse = await insertIntegrationTwice(session, payload, true);
    const integrations = await integrationRepository.findByApplicationId(secondInsertResponse.body.data._applicationId);

    expect(integrations.length).to.equal(2);

    const emailIntegration = integrations.find((i) => i.channel.toString() === 'EMAIL');
    const smsIntegration = integrations.find((i) => i.channel.toString() === 'SMS');

    expect(emailIntegration).to.be.ok;
    expect(smsIntegration).to.be.ok;
  });

  it('should return error on creation of same provider on same application twice', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    const secondInsertResponse = await insertIntegrationTwice(session, payload, false);

    expect(secondInsertResponse.body.message).to.contain('Duplicate key');
  });

  it('should fail due missing param', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      active: true,
    };

    const body = (await session.testAgent.post('/v1/integrations').send(payload)).body.data as IntegrationEntity;

    expect(body).to.equal(undefined);
  });

  it('should deactivated old providers', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    const firstIntegrationResponse = await session.testAgent.post('/v1/integrations').send(payload);

    const secondPayload = payload;

    secondPayload.providerId = 'mailgun';

    await session.testAgent.post('/v1/integrations').send(payload);

    const integrations = await integrationRepository.findByApplicationId(
      firstIntegrationResponse.body.data._applicationId
    );

    const firstIntegration = integrations.find((i) => i.providerId.toString() === 'sendgrid');
    const secondIntegration = integrations.find((i) => i.providerId.toString() === 'mailgun');

    expect(firstIntegration.active).to.equal(false);
    expect(secondIntegration.active).to.equal(true);
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
    payload.channel = 'SMS';
  }

  const body = await session.testAgent.post('/v1/integrations').send(payload);

  return body;
}
