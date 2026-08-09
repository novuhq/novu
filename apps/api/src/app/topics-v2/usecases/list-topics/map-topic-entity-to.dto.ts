import { SubscriberEntity, TopicEntity, TopicSubscribersEntity } from '@novu/dal';
import { SubscriptionPreferenceDto } from '../../../shared/dtos/subscriptions/create-subscriptions-response.dto';
import { TopicResponseDto } from '../../dtos/topic-response.dto';
import { TopicSubscriptionResponseDto } from '../../dtos/topic-subscription-response.dto';

export function mapTopicEntityToDto(topicEntity: TopicEntity): TopicResponseDto {
  return {
    _id: String(topicEntity._id),
    name: topicEntity.name,
    key: topicEntity.key,
    createdAt: topicEntity.createdAt,
    updatedAt: topicEntity.updatedAt,
  };
}

export function mapTopicSubscriptionsToDto(
  subscription: TopicSubscribersEntity,
  subscriber: SubscriberEntity,
  topic: TopicEntity,
  preferences?: SubscriptionPreferenceDto[]
): TopicSubscriptionResponseDto {
  return {
    _id: String(subscription._id),
    identifier: subscription.identifier ?? '',
    topic: mapTopicEntityToDto(topic),
    createdAt: subscription.createdAt!,
    contextKeys: subscription.contextKeys,
    preferences: preferences && preferences.length > 0 ? preferences : undefined,
    subscriber: {
      _id: String(subscriber._id),
      subscriberId: subscriber.subscriberId,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      email: subscriber.email,
      avatar: subscriber.avatar,
    },
  };
}
