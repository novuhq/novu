import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, InstrumentUsecase } from '@novu/application-generic';
import { PreferencesRepository, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, PreferencesTypeEnum } from '@novu/shared';
import { stripContextFromIdentifier } from '../../../subscriptions/utils/subscriptions';
import { DeleteTopicSubscriptionCommand } from './delete-subscription.command';

@Injectable()
export class DeleteTopicSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private topicRepository: TopicRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicSubscriptionCommand): Promise<{ success: boolean }> {
    const isContextEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });

    if (!isContextEnabled) {
      command.identifier = stripContextFromIdentifier(command.identifier);
    }

    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const contextQuery = await this.buildContextExactMatchQuery(command.contextKeys, command.organizationId);

    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _topicId: topic._id,
      identifier: command.identifier,
      ...contextQuery,
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with identifier ${command.identifier} not found`);
    }

    await this.topicSubscribersRepository.withTransaction(async () => {
      // Delete preferences for THIS subscription's context
      await this.preferencesRepository.delete({
        _environmentId: command.environmentId,
        _subscriberId: subscription._subscriberId,
        _topicSubscriptionId: subscription._id,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
        ...contextQuery,
      });

      await this.topicSubscribersRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: subscription._id,
      });
    });

    return { success: true };
  }

  private async buildContextExactMatchQuery(
    contextKeys: string[] | undefined,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    const useContextFiltering = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });

    if (!useContextFiltering) {
      return {}; // FF OFF: no context filtering (pre-feature behavior)
    }

    // undefined or empty array = match only "no context" subscriptions/preferences
    if (contextKeys === undefined || contextKeys.length === 0) {
      return {
        $or: [{ contextKeys: { $exists: false } }, { contextKeys: [] }],
      };
    }

    // non-empty array = exact match
    return {
      contextKeys: { $all: contextKeys, $size: contextKeys.length },
    };
  }
}
