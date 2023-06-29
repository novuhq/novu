import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
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
      providerId: EmailProviderIdEnum.Mailgun,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    await session.testAgent.post('/v1/integrations').send(payload);

    const result = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    // We expect to find the test data 12 with the email one for the chosen environment replaced by the one created
    expect(result.length).to.eq(12);

    const activeEmailIntegration = result.find(
      (integration) =>
        integration.channel == ChannelTypeEnum.EMAIL && integration._environmentId === session.environment._id
    );

    expect(activeEmailIntegration.providerId).to.equal('mailgun');
    expect(activeEmailIntegration.credentials.apiKey).to.equal('123');
    expect(activeEmailIntegration.credentials.secretKey).to.equal('abc');
    expect(activeEmailIntegration.active).to.equal(true);

    const environmentIntegrations = await integrationRepository.findByEnvironmentId(
      activeEmailIntegration?._environmentId
    );

    // We expect to find the test data 6 plus the one created
    expect(environmentIntegrations.length).to.eq(7);

    const encryptedStoredIntegration = environmentIntegrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.Mailgun
    );

    expect(encryptedStoredIntegration?.providerId).to.equal('mailgun');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.not.equal('123');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.not.equal('abc');
    expect(encryptedStoredIntegration?.active).to.equal(true);
  });
});
