import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository, TopicSubscribersRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { SubscriptionDetailsResponseDto } from '../../../shared/dtos/subscription-details-response.dto';
import { mapTopicSubscriptionToDto, SELECTED_WORKFLOW_FIELDS_PROJECTION } from '../../utils/subscriptions';
import { GetSubscriptionCommand } from './get-subscription.command';

@Injectable()
export class GetSubscription {
  constructor(
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferencesRepository: PreferencesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetSubscriptionCommand): Promise<SubscriptionDetailsResponseDto | null> {
    const subscription = await this.topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      topicKey: command.topicKey,
      ...(TopicSubscribersRepository.isInternalId(command.subscriptionIdOrIdentifier)
        ? { _id: command.subscriptionIdOrIdentifier }
        : { identifier: command.subscriptionIdOrIdentifier }),
    });

    if (!subscription) {
      return null;
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
