import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';

export async function updateFcmCredentials() {
  // eslint-disable-next-line no-console
  console.log('start migration - update fcm credentials (user to serviceAccount)');

  const integrationRepository = new IntegrationRepository();

  // eslint-disable-next-line no-console
  console.log('rename all credentials.user credentials.serviceAccount - channel push, provider fcm');

  await integrationRepository.update(
    {
      provider: 'fcm',
      channel: ChannelTypeEnum.PUSH,
      'credentials.user': { $exists: true },
    },
    { $rename: { 'credentials.user': 'credentials.serviceAccount' } }
  );

  // eslint-disable-next-line no-console
  console.log('end migration');
}
