import { faker } from '@faker-js/faker';
import { SubscriberRepository } from '@novu/dal';
import { DirectProviderIdEnum } from '@novu/shared';

export class SubscribersService {
  private subscriberRepository = new SubscriberRepository();

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
          providerId: DirectProviderIdEnum.Slack,
          credentials: { accessToken: '123', channelId: '#general' },
        },
      ],
    });
  }
}
