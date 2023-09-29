import { Injectable, NotFoundException } from '@nestjs/common';
import { ExecutionDetailsEntity, ExecutionDetailsRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { buildSubscriberKey, CachedEntity } from '@novu/application-generic';
import { GetExecutionDetailsCommand } from './get-execution-details.command';

@Injectable()
export class GetExecutionDetails {
  constructor(
    private executionDetailsRepository: ExecutionDetailsRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GetExecutionDetailsCommand): Promise<ExecutionDetailsEntity[]> {
    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber not found for id ${command.subscriberId}`);
    }

    return this.executionDetailsRepository.find({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _subscriberId: subscriber?._id,
    });
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId, true);
  }
}
