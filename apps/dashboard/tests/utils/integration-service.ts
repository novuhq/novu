import { ChannelTypeEnum, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { InAppProviderIdEnum } from '@novu/shared';

export class IntegrationService {
  private integrationRepository = new IntegrationRepository();

  public async createInAppIntegration({
    organizationId,
    environmentId,
  }: {
    organizationId: string;
    environmentId: string;
  }): Promise<IntegrationEntity> {
    const inAppPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      credentials: {
        hmac: false,
      },
      active: true,
      identifier: 'novu-in-app',
    };

    return await this.integrationRepository.create(inAppPayload);
  }
}
