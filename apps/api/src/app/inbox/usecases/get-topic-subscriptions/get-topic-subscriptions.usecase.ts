import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { TopicSubscriptionDetailsDto } from '../../dtos/get-topic-subscriptions-response.dto';
import { mapTopicSubscriptionToDto } from '../../utils/topic-subscription-mapper';
import { GetTopicSubscriptionsCommand } from './get-topic-subscriptions.command';

@Injectable()
export class GetTopicSubscriptions {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetTopicSubscriptionsCommand): Promise<TopicSubscriptionDetailsDto[]> {
    const subscriptions = await this.topicSubscribersRepository.find({
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
      topicKey: command.topicKey,
    });

    return await this.buildSubscriptionsResponse(subscriptions);
  }

  private async buildSubscriptionsResponse(
    subscriptions: TopicSubscribersEntity[]
  ): Promise<TopicSubscriptionDetailsDto[]> {
    const subscriptionPreferencesMap = new Map<TopicSubscribersEntity, PreferencesEntity[]>();

    for (const subscription of subscriptions) {
      const preferences = await this.preferencesRepository.find({
        _environmentId: subscription._environmentId,
        _organizationId: subscription._organizationId,
        _topicSubscriptionId: subscription._id,
        _subscriberId: subscription._subscriberId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
      });
      subscriptionPreferencesMap.set(subscription, preferences);
    }

    const workflowsMap = await this.buildWorkflowsMap(subscriptionPreferencesMap, subscriptions);

    const result: TopicSubscriptionDetailsDto[] = [];

    for (const [subscription, preferencesEntities] of subscriptionPreferencesMap) {
      const preferenceWorkflowIds = preferencesEntities
        .map((pref) => pref._templateId?.toString())
        .filter((id): id is string => id !== undefined);

      const workflows = preferenceWorkflowIds
        .map((id) => workflowsMap.get(id))
        .filter((workflow): workflow is NotificationTemplateEntity => workflow !== undefined);

      result.push(mapTopicSubscriptionToDto(subscription, preferencesEntities, workflows));
    }

    return result;
  }

  private async buildWorkflowsMap(
    subscriptionPreferencesMap: Map<TopicSubscribersEntity, PreferencesEntity[]>,
    subscriptions: TopicSubscribersEntity[]
  ): Promise<Map<string, NotificationTemplateEntity>> {
    const uniqueWorkflowIds = new Set(
      Array.from(subscriptionPreferencesMap.values())
        .flat()
        .map((pref) => pref._templateId?.toString())
        .filter((id): id is string => id !== undefined)
    );

    const workflowsMap = new Map<string, NotificationTemplateEntity>();

    if (uniqueWorkflowIds.size > 0 && subscriptions.length > 0) {
      const workflows = await this.notificationTemplateRepository.find({
        _id: { $in: Array.from(uniqueWorkflowIds) },
        _environmentId: subscriptions[0]._environmentId,
        _organizationId: subscriptions[0]._organizationId,
      });

      for (const workflow of workflows) {
        workflowsMap.set(workflow._id, workflow);
      }
    }

    return workflowsMap;
  }
}
