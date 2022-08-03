import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

export class IntegrationService {
  private integrationRepository = new IntegrationRepository();

  async createIntegration(environmentId: string, organizationId: string) {
    const mailPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
    };

    await this.integrationRepository.create(mailPayload);

    const smsPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'twilio',
      channel: ChannelTypeEnum.SMS,
      credentials: { accountSid: 'AC123', token: '123', from: 'me' },
      active: true,
    };
    await this.integrationRepository.create(smsPayload);

    const directSlackPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'slack',
      channel: ChannelTypeEnum.DIRECT,
      credentials: { applicationId: 'secret_123' },
      active: true,
    };

    await this.integrationRepository.create(directSlackPayload);

    const directDiscordPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'discord',
      channel: ChannelTypeEnum.DIRECT,
      credentials: { applicationId: 'secret_123' },
      active: true,
    };

    await this.integrationRepository.create(directDiscordPayload);

    const pushFcmPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'fcm',
      channel: ChannelTypeEnum.PUSH,
      credentials: { applicationId: 'secret_123', notificationIdentifiers: ['test'] },
      active: true,
    };

    await this.integrationRepository.create(pushFcmPayload);
  }
}
