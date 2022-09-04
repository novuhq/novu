import { IntegrationRepository, IntegrationEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';

export async function updateFcmCredentials() {
  // eslint-disable-next-line no-console
  console.log('start migration - update fcm credentials (user to serviceAccount)');

  const integrationRepository = new IntegrationRepository();

  const integrations = await integrationRepository.find({
    provider: 'fcm',
    channel: ChannelTypeEnum.PUSH,
    'credentials.user': { $exists: true },
  });

  for (const integration of integrations) {
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id}`);

    const updatePayload: Partial<IntegrationEntity> = {};

    if (!integration.credentials?.user) {
      // eslint-disable-next-line no-console
      console.log(`integration ${integration._id} - is not contains credential.user, skipping..`);
      continue;
    }

    // fcmConfig at the moment contains only serviceAccount therefore no need in adding other params
    updatePayload.credentials = {};
    updatePayload.credentials.serviceAccount = integration.credentials.user;

    await integrationRepository.update(
      { _id: integration._id },
      {
        $set: updatePayload,
      }
    );
    // eslint-disable-next-line no-console
    console.log(`integration ${integration._id} - credentials updated`);
  }
  // eslint-disable-next-line no-console
  console.log('end migration');
}
