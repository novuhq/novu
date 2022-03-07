import { IntegrationEntity } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe('Get Integration - /integrations (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get newly created integration', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    await session.testAgent.post('/v1/integrations').send(payload);

    const integrations = (await session.testAgent.get('/v1/integrations').send(payload)).body
      .data as IntegrationEntity[];

    expect(integrations.length).to.equal(1);

    const integration = integrations[0];

    expect(integration.providerId).to.equal(payload.providerId);
    expect(integration.channel).to.equal(payload.channel);
    expect(integration.credentials.apiKey).to.equal(payload.credentials.apiKey);
    expect(integration.credentials.secretKey).to.equal(payload.credentials.secretKey);
    expect(integration.active).to.equal(payload.active);
  });
});
