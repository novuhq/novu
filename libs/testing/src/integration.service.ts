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
      credentials: { apiKey: 'SG.123', secretKey: 'abc' },
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

    const chatSlackPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'slack',
      channel: ChannelTypeEnum.CHAT,
      credentials: { applicationId: 'secret_123' },
      active: true,
    };

    await this.integrationRepository.create(chatSlackPayload);

    const chatDiscordPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'discord',
      channel: ChannelTypeEnum.CHAT,
      credentials: { applicationId: 'secret_123' },
      active: true,
    };

    await this.integrationRepository.create(chatDiscordPayload);

    const pushFcmPayload = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: 'fcm',
      channel: ChannelTypeEnum.PUSH,
      credentials: { applicationId: 'secret_123', deviceTokens: ['test'] },
      active: true,
    };

    await this.integrationRepository.create(pushFcmPayload);
  }
}
