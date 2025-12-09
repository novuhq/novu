import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository, TopicSubscribersRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { TopicSubscriptionDetailsResponseDto } from '../../dtos/get-topic-subscriptions-response.dto';
import { mapTopicSubscriptionToDto } from '../../utils/topic-subscription-mapper';
import { SELECTED_WORKFLOW_FIELDS_PROJECTION } from '../get-topic-subscriptions/get-topic-subscriptions.usecase';
import { GetTopicSubscriptionCommand } from './get-topic-subscription.command';

@Injectable()
export class GetTopicSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetTopicSubscriptionCommand): Promise<TopicSubscriptionDetailsResponseDto> {
    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      topicKey: command.topicKey,
      ...(TopicSubscribersRepository.isInternalId(command.subscriptionIdOrIdentifier)
        ? { _id: command.subscriptionIdOrIdentifier }
        : { identifier: command.subscriptionIdOrIdentifier }),
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${command.subscriptionIdOrIdentifier} not found for topic ${command.topicKey}`
      );
    }

    const preferencesEntities = await this.preferencesRepository.find({
      _environmentId: subscription._environmentId,
      _subscriberId: subscription._subscriberId,
      _topicSubscriptionId: subscription._id,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
    });

    const preferencesWorkflowIds = preferencesEntities
      .map((pref) => pref._templateId?.toString())
      .filter((id): id is string => id !== undefined);

    const workflowEntities =
      preferencesWorkflowIds.length > 0
        ? await this.notificationTemplateRepository.find(
            {
              _id: { $in: preferencesWorkflowIds },
              _environmentId: subscription._environmentId,
              _organizationId: subscription._organizationId,
            },
            SELECTED_WORKFLOW_FIELDS_PROJECTION
          )
        : [];

    return mapTopicSubscriptionToDto(subscription, preferencesEntities, workflowEntities);
  }
}
