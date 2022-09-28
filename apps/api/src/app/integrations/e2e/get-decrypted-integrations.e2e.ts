import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';
import { IntegrationRepository } from '@novu/dal';

describe('Get Decrypted Integrations - /integrations (GET)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get active decrypted integration', async function () {
    const payload = {
      providerId: 'mailgun',
      channel: 'email',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    await session.testAgent.post('/v1/integrations').send(payload);

    const result = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    const activeEmailIntegration = result.find((integration) => integration.channel == ChannelTypeEnum.EMAIL);

    expect(activeEmailIntegration.providerId).to.equal('mailgun');
    expect(activeEmailIntegration.credentials.apiKey).to.equal('123');
    expect(activeEmailIntegration.credentials.secretKey).to.equal('abc');
    expect(activeEmailIntegration.active).to.equal(true);

    const encryptedStoredIntegration = (
      await integrationRepository.findByEnvironmentId(activeEmailIntegration?._environmentId)
    ).find((i) => i.providerId.toString() === 'mailgun');

    expect(encryptedStoredIntegration.providerId).to.equal('mailgun');
    expect(encryptedStoredIntegration.credentials.apiKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration.credentials.apiKey).to.not.equal('123');
    expect(encryptedStoredIntegration.credentials.secretKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration.credentials.secretKey).to.not.equal('abc');
    expect(encryptedStoredIntegration.active).to.equal(true);
  });
});
