import { faker } from '@faker-js/faker';
import { IntegrationRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class SubscribersService {
  private subscriberRepository = new SubscriberRepository();
  private integrationRepository = new IntegrationRepository();

  constructor(private _organizationId: string, private _environmentId: string) {}

  async createSubscriber(fields: Partial<SubscriberEntity> = {}) {
    const integrations = await this.integrationRepository.find({
      _environmentId: this._environmentId,
      _organizationId: this._organizationId,
    });

    const slackIntegration = integrations.find((integration) => integration.providerId === ChatProviderIdEnum.Slack);
    const fcmIntegration = integrations.find((integration) => integration.providerId === PushProviderIdEnum.FCM);
    const channels: SubscriberEntity['channels'] = [];
    if (slackIntegration) {
      channels.push({
        _integrationId: slackIntegration._id,
        providerId: ChatProviderIdEnum.Slack,
        credentials: { webhookUrl: 'webhookUrl' },
      });
    }

    if (fcmIntegration) {
      channels.push({
        _integrationId: fcmIntegration._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: ['identifier'] },
      });
    }

    return await this.subscriberRepository.create({
      lastName: faker.name.lastName(),
      firstName: faker.name.firstName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      _environmentId: this._environmentId,
      _organizationId: this._organizationId,
      subscriberId: SubscriberRepository.createObjectId(),
      channels,
      ...fields,
    });
  }
}
