import { faker } from '@faker-js/faker';
import { SubscriberEntity, SubscriberRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class SubscribersService {
  private subscriberRepository = new SubscriberRepository();

  constructor(private _organizationId: string, private _environmentId: string) {}

  private integrationRepository = new IntegrationRepository();

  async createSubscriber(fields: Partial<SubscriberEntity> = {}) {
    const integrations = await this.integrationRepository.find({
      _environmentId: this._environmentId,
      _organizationId: this._organizationId,
    });

    const slackIntegration = integrations.find((integration) => integration.providerId === ChatProviderIdEnum.Slack);
    const fcmIntegration = integrations.find((integration) => integration.providerId === PushProviderIdEnum.FCM);

    return await this.subscriberRepository.create({
      lastName: faker.name.lastName(),
      firstName: faker.name.firstName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      _environmentId: this._environmentId,
      _organizationId: this._organizationId,
      subscriberId: SubscriberRepository.createObjectId(),
      channels: [
        {
          _integrationId: slackIntegration?._id ?? 'integrationId_slack',
          providerId: ChatProviderIdEnum.Slack,
          credentials: { webhookUrl: 'webhookUrl' },
        },
        {
          _integrationId: fcmIntegration?._id ?? 'integrationId_fcm',
          providerId: PushProviderIdEnum.FCM,
          credentials: { deviceTokens: ['identifier'] },
        },
      ],
      ...fields,
    });
  }
}
