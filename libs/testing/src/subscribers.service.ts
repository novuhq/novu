import { faker } from '@faker-js/faker';
import { SubscriberRepository, CacheService } from '@novu/dal';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class SubscribersService {
  private cacheService = new CacheService({
    cachePort: process.env.REDIS_CACHE_PORT,
    cacheHost: process.env.REDIS_CACHE_HOST,
  });
  private subscriberRepository = new SubscriberRepository(this.cacheService);

  constructor(private _organizationId: string, private _environmentId: string) {}

  async createSubscriber() {
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
          _integrationId: 'integrationId_slack',
          providerId: ChatProviderIdEnum.Slack,
          credentials: { webhookUrl: 'webhookUrl' },
        },
        {
          _integrationId: 'integrationId_fcm',
          providerId: PushProviderIdEnum.FCM,
          credentials: { deviceTokens: ['identifier'] },
        },
      ],
    });
  }
}
