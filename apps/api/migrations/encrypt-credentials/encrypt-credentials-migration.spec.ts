import { expect } from 'chai';
import { encryptOldCredentialsMigration } from './encrypt-credentials-migration';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum } from '@novu/stateless';
import { IntegrationRepository } from '@novu/dal';

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
        credentials: {
          apiKey: '123',
          user: 'smith' + i,
          secretKey: '123',
          domain: 'domain',
          password: '123',
          host: 'host',
          port: 'port',
          secure: true,
          region: 'region',
          accountSid: 'accountSid',
          messageProfileId: 'messageProfileId',
          token: '123',
          from: 'from',
          senderName: 'senderName',
          applicationId: 'applicationId',
          clientId: 'clientId',
          projectName: 'projectName',
        },
        active: data.active,
      });
    }

    const newIntegration = await integrationRepository.find({} as any);

    expect(newIntegration.length).to.equal(2);

    await encryptOldCredentialsMigration();

    const encryptIntegration = await integrationRepository.find({} as any);

    for (const integrationKey in encryptIntegration) {
      const integration = encryptIntegration[integrationKey];

      expect(integration.credentials.apiKey).to.contains('nvsk.');
      expect(integration.credentials.user).to.equal('smith' + integrationKey);
      expect(integration.credentials.secretKey).to.contains('nvsk.');
      expect(integration.credentials.domain).to.equal('domain');
      expect(integration.credentials.password).to.contains('nvsk.');
      expect(integration.credentials.host).to.equal('host');
      expect(integration.credentials.secure).to.contains('nvsk.');
      expect(integration.credentials.region).to.equal('region');
      expect(integration.credentials.accountSid).to.equal('accountSid');
      expect(integration.credentials.messageProfileId).to.equal('messageProfileId');
      expect(integration.credentials.token).to.contains('nvsk.');
      expect(integration.credentials.from).to.equal('from');
      expect(integration.credentials.senderName).to.equal('senderName');
      expect(integration.credentials.applicationId).to.equal('applicationId');
      expect(integration.credentials.clientId).to.equal('clientId');
      expect(integration.credentials.projectName).to.equal('projectName');
    }
  });
});

async function pruneIntegration(integrationRepository) {
  const old = await integrationRepository.find({});

  for (const oldKey in old) {
    await integrationRepository.delete({ _id: old[oldKey] });
  }
}
