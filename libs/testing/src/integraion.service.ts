import { IntegrationRepository } from '@notifire/dal';
import { ChannelTypeEnum } from '@notifire/shared';

export class IntegrationService {
  private integrationRepository = new IntegrationRepository();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createIntegration(applicationId: string, organizationId: string) {
    const payload = {
      _applicationId: applicationId,
      _organizationId: organizationId,
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    return await this.integrationRepository.create(payload);
  }
}
