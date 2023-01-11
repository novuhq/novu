import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';

import { UpdateSubscriberOnlineFlagCommand } from './update-subscriber-online-flag.command';

@Injectable()
export class UpdateSubscriberOnlineFlag {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: UpdateSubscriberOnlineFlagCommand) {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber not found`);

    await this.subscriberRepository.update(
      { _id: subscriber._id, _organizationId: command.organizationId, _environmentId: command.environmentId },
      {
        $set: {
          isOnline: command.isOnline,
          ...(!command.isOnline && { lastOnlineAt: new Date().toISOString() }),
        },
      }
    );

    return (await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    )) as SubscriberEntity;
  }
}
