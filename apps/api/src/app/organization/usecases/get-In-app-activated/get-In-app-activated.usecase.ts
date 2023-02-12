import { SubscriberRepository } from '@novu/dal';
import { GetInAppActivatedCommand } from './get-In-app-activated.command';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetInAppActivated {
  constructor(private readonly subscriberRepository: SubscriberRepository) {}

  async execute(command: GetInAppActivatedCommand): Promise<boolean> {
    const inAppSubscriberCount = await this.subscriberRepository.find({
      _organizationId: command.organizationId,
      isOnline: { $exists: true },
      subscriberId: { $not: /cli-/ },
    });

    return inAppSubscriberCount.length > 0;
  }
}
