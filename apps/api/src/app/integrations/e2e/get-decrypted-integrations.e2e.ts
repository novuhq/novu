import { decryptCredentials } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, maskSecret } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { withIntegrationStoreV2Flag } from './integration-store-v2-flag';

describe('Get Decrypted Integrations - /integrations (GET) #novu-v2', () => {
  withIntegrationStoreV2Flag(true);

  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get the active integration with masked secrets, stored encrypted', async () => {
    const payload = {
      providerId: EmailProviderIdEnum.Mailgun,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    await session.testAgent.post('/v1/integrations').send(payload);

    const result = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    // We expect to find the test data 13 with the email one
    expect(result.length).to.eq(13);

    const activeEmailIntegrations = result.filter(
      (integration) =>
        integration.channel === ChannelTypeEnum.EMAIL && integration._environmentId === session.environment._id
    );

    expect(activeEmailIntegrations.length).to.eq(2);

    const mailgun = activeEmailIntegrations.find((el) => el.providerId === EmailProviderIdEnum.Mailgun);

    expect(mailgun.providerId).to.equal('mailgun');
    expect(mailgun.credentials.apiKey).to.equal(maskSecret('123'));
    expect(mailgun.credentials.secretKey).to.equal(maskSecret('abc'));
    expect(mailgun.active).to.equal(true);

    const environmentIntegrations = await integrationRepository.findByEnvironmentId(session.environment._id);

    // We expect to find the test data 8 with novu provider integrations plus the one created
    expect(environmentIntegrations.length).to.eq(9);

    const encryptedStoredIntegration = environmentIntegrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.Mailgun
    );

    expect(encryptedStoredIntegration?.providerId).to.equal('mailgun');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.apiKey).to.not.equal('123');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.contains('nvsk.');
    expect(encryptedStoredIntegration?.credentials.secretKey).to.not.equal('abc');
    expect(encryptedStoredIntegration?.active).to.equal(true);

    const storedCredentials = decryptCredentials(encryptedStoredIntegration?.credentials ?? {});
    expect(storedCredentials.apiKey).to.equal('123');
    expect(storedCredentials.secretKey).to.equal('abc');
  });
});
