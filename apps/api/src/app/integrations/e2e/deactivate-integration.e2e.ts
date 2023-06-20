import { IntegrationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Deactivate Integration', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    process.env.IS_MULTI_PROVIDER_CONFIGURATION_ENABLED = 'false';
  });

  it('should not deactivated old providers when feature flag is active', async function () {
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

    expect(firstIntegration?.active).to.equal(true);
    expect(secondIntegration?.active).to.equal(true);
  });
});
