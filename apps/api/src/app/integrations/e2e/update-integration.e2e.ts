import { IntegrationRepository } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe('Update Integration - /integration (PUT)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update newly created integration', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    // create integration
    const initialIntegrationResponse = await session.testAgent.post('/v1/integrations').send(payload);

    const updatedPayload = payload;

    updatedPayload.credentials = { apiKey: 'new_key', secretKey: 'new_secret' };

    const integrationId = initialIntegrationResponse.body.data._id;

    // update integration
    await session.testAgent.put(`/v1/integrations/${integrationId}`).send(updatedPayload);

    const integration = (await integrationRepository.findByApplicationId(session.application._id))[0];

    expect(integration.credentials.apiKey).to.equal(updatedPayload.credentials.apiKey);
    expect(integration.credentials.secretKey).to.equal(updatedPayload.credentials.secretKey);
  });

  it('should deactivate other providers on the same channel', async function () {
    const firstProviderPayload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };
    const secondProviderPayload = {
      providerId: 'mailgun',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: false,
    };

    // create integrations
    await session.testAgent.post('/v1/integrations').send(firstProviderPayload);
    const mailgunIntegrationId = (await session.testAgent.post('/v1/integrations').send(secondProviderPayload)).body
      .data._id;

    // create irrelevant channel -> should not be affected by the update
    firstProviderPayload.channel = 'SMS';
    await session.testAgent.post('/v1/integrations').send(firstProviderPayload);

    // update second integration
    secondProviderPayload.active = true;
    await session.testAgent.put(`/v1/integrations/${mailgunIntegrationId}`).send(secondProviderPayload);

    const integrations = await integrationRepository.findByApplicationId(session.application._id);

    const firstProviderIntegration = integrations.find(
      (i) => i.providerId.toString() === 'sendgrid' && i.channel.toString() === 'EMAIL'
    );
    const secondProviderIntegration = integrations.find((i) => i.providerId.toString() === 'mailgun');
    const irrelevantProviderIntegration = integrations.find(
      (i) => i.providerId.toString() === 'sendgrid' && i.channel.toString() === 'SMS'
    );

    expect(firstProviderIntegration.active).to.equal(false);
    expect(secondProviderIntegration.active).to.equal(true);
    expect(irrelevantProviderIntegration.active).to.equal(true);
  });
});
