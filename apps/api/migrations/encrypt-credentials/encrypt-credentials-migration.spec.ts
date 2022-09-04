import { expect } from 'chai';
import { encryptOldCredentialsMigration } from './encrypt-credentials-migration';
import { UserSession } from '@novu/testing/src';
import { ChannelTypeEnum } from '@novu/stateless';
import { IntegrationRepository } from '@novu/dal/src';

describe('Encrypt Old Credentials', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should decrypt all old credentials', async function () {
    await pruneIntegration(integrationRepository);

    const data = {
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      active: false,
    };

    for (let i = 0; i < 2; i++) {
      await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: data.providerId + i,
        channel: data.channel,
        credentials: { user: 'smith' + i, apiKey: '123' + i, secretKey: 'abc' + i },
        active: data.active,
      });
    }

    const newIntegration = await integrationRepository.find({});

    expect(newIntegration.length).to.equal(2);

    await encryptOldCredentialsMigration();

    const encryptIntegration = await integrationRepository.find({});

    for (const integrationKey in encryptIntegration) {
      const integration = encryptIntegration[integrationKey];

      expect(integration.credentials.user).to.equal('smith' + integrationKey);
      expect(integration.credentials.apiKey).to.contains('nvsk.');
      expect(integration.credentials.secretKey).to.contains('nvsk.');
    }
  });
});

async function pruneIntegration(integrationRepository) {
  const old = await integrationRepository.find({});

  for (const oldKey in old) {
    await integrationRepository.delete({ _id: old[oldKey] });
  }
}
