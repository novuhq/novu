import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository, MemberRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

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

  private async trackIsOnlineUpdate(command: UpdateSubscriberOnlineFlagCommand, subscriber: SubscriberEntity) {
    const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
    if (admin) {
      this.analyticsService.track('Update online flag - [Subscriber]', admin._userId, {
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        ...this.getUpdatedFields(command.isOnline),
      });
    }
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
    this.trackIsOnlineUpdate(command, subscriber);

    return (await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    )) as SubscriberEntity;
  }
}
