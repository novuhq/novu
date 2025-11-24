import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { PreferencesRepository, TopicSubscribersRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { DeleteTopicSubscriptionCommand } from './delete-topic-subscription.command';

@Injectable()
export class DeleteTopicSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicSubscriptionCommand): Promise<{ success: boolean }> {
    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _id: command.subscriptionId,
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${command.subscriptionId} not found`);
    }

    await this.topicSubscribersRepository.withTransaction(async () => {
      await this.preferencesRepository.delete({
        _environmentId: command.environmentId,
        _subscriberId: subscription._subscriberId,
        _topicSubscriptionId: subscription._id,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      });

      await this.topicSubscribersRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.subscriptionId,
      });
    });

    return { success: true };
  }
}
