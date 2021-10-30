import * as faker from 'faker';
import { SubscriberRepository } from '@notifire/dal';

export class SubscribersService {
  private subscriberRepository = new SubscriberRepository();

  constructor(private _organizationId: string, private _applicationId: string) {}

  async createSubscriber() {
    return await this.subscriberRepository.create({
      lastName: faker.name.lastName(),
      firstName: faker.name.firstName(),
      email: faker.internet.email(),
      _applicationId: this._applicationId,
      _organizationId: this._organizationId,
      subscriberId: faker.random.uuid(),
    });
  }
}
