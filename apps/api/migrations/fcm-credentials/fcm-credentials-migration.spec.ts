import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum } from '@novu/stateless';
import { IntegrationRepository } from '@novu/dal';
import { PushProviderIdEnum } from '@novu/shared';
import { updateFcmCredentials } from './fcm-credentials-migration';

describe('Update fcm credential type', function () {
  const integrationRepository = new IntegrationRepository();

  it('should update fcm credential user type', async function () {
    const data = {
      providerId: 'fcm',
      channel: ChannelTypeEnum.PUSH,
      active: false,
    };

    for (let i = 0; i < 3; i++) {
      const session = new UserSession();
      await session.initialize();

      await pruneIntegration(integrationRepository, session);

      await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: data.providerId,
        channel: data.channel,
        credentials: { user: '{ name : john, secret: 123 }' },
        active: data.active,
      });
    }

    const integrations = await integrationRepository.find({ credentials: { user: 'fcm' } });

    for (const integrationKey in integrations) {
      const integration = integrations[integrationKey];

      expect(integration.credentials.user).to.contains('{ name : john, secret: 123 }');
    }

    await updateFcmCredentials();

    const integrationsUpdated = await integrationRepository.find({ providerId: 'fcm' });

    for (const integration of integrationsUpdated) {
      expect(integration.credentials.user).to.eq(undefined);
      expect(integration.credentials.serviceAccount).to.contains('{ name : john, secret: 123 }');
    }
  });
});

async function pruneIntegration(integrationRepository: IntegrationRepository, session: UserSession) {
  const old = await integrationRepository.find({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: PushProviderIdEnum.FCM,
  });

  for (const oldKey in old) {
    await integrationRepository.delete({ _id: old[oldKey] });
  }
}
