import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { MemberRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';

import { UpdateSubscriberOnlineFlagCommand } from './update-subscriber-online-flag.command';

@Injectable()
export class UpdateSubscriberOnlineFlag {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private memberRepository: MemberRepository
  ) {}

  private getUpdatedFields(isOnline: boolean) {
    return {
      isOnline,
      ...(!isOnline && { lastOnlineAt: new Date().toISOString() }),
    };
  }

  async execute(command: UpdateSubscriberOnlineFlagCommand) {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber not found`);

    await this.subscriberRepository.update(
      { _id: subscriber._id, _organizationId: command.organizationId, _environmentId: command.environmentId },
      {
        $set: this.getUpdatedFields(command.isOnline),
      }
    );

    return (await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    )) as SubscriberEntity;
  }
}
