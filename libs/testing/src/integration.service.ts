import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export class IntegrationService {
  private integrationRepository = new IntegrationRepository();

  async createIntegration(applicationId: string, organizationId: string) {
    const mailPayload = {
      _applicationId: applicationId,
      _organizationId: organizationId,
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    await this.integrationRepository.create(mailPayload);

    const smsPayload = {
      _applicationId: applicationId,
      _organizationId: organizationId,
      providerId: 'twilio',
      channel: ChannelTypeEnum.SMS,
      credentials: { accountSid: 'AC123', token: '123', from: 'me' },
      active: true,
    };

    await this.integrationRepository.create(smsPayload);
  }
}
