import { decryptCredentials, isInfobipSmsBaseUrlValid } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, SmsProviderIdEnum } from '@novu/shared';
export async function deactivateMisconfiguredInfobipSmsIntegrations() {
  console.log('start migration - deactivate misconfigured Infobip SMS integrations');

  const integrationRepository = new IntegrationRepository();
  const integrations = await integrationRepository.find({
    providerId: SmsProviderIdEnum.Infobip,
    channel: ChannelTypeEnum.SMS,
    active: true,
  });

  let deactivatedCount = 0;

  for (const integration of integrations) {
    const credentials = integration.credentials ? decryptCredentials(integration.credentials) : {};

    if (isInfobipSmsBaseUrlValid(credentials.baseUrl)) {
      continue;
    }

    await integrationRepository.update(
      {
        _id: integration._id,
        _environmentId: integration._environmentId,
      },
      {
        $set: { active: false },
      }
    );

    deactivatedCount += 1;
    console.log(`deactivated Infobip SMS integration ${integration._id} due to missing or unsafe baseUrl`);
  }

  console.log(`end migration - deactivated ${deactivatedCount} Infobip SMS integrations`);
}
