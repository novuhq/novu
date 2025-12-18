import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { PreferencesRepository, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { DeleteTopicSubscriptionCommand } from './delete-subscription.command';

@Injectable()
export class DeleteTopicSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private topicRepository: TopicRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicSubscriptionCommand): Promise<{ success: boolean }> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _topicId: topic._id,
      identifier: command.identifier,
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with identifier ${command.identifier} not found`);
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
        _id: subscription._id,
      });
    });

    return { success: true };
  }
}
