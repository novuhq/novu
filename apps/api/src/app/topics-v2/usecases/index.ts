import { CreateTopicSubscriptionsUsecase } from './create-topic-subscriptions/create-topic-subscriptions.usecase';
import { DeleteTopicUseCase } from './delete-topic/delete-topic.usecase';
import { DeleteTopicSubscriptionsUsecase } from './delete-topic-subscriptions/delete-topic-subscriptions.usecase';
import { GetTopicUseCase } from './get-topic/get-topic.usecase';
import { ListSubscriberSubscriptionsUseCase } from './list-subscriber-subscriptions/list-subscriber-subscriptions.usecase';
import { ListTopicSubscriptionsUseCase } from './list-topic-subscriptions/list-topic-subscriptions.usecase';
import { ListTopicsUseCase } from './list-topics/list-topics.usecase';
import { UpdateTopicUseCase } from './update-topic/update-topic.usecase';
import { UpsertTopicUseCase } from './upsert-topic/upsert-topic.usecase';

export const USE_CASES = [
  CreateTopicSubscriptionsUsecase,
  DeleteTopicSubscriptionsUsecase,
  DeleteTopicUseCase,
  GetTopicUseCase,
  ListSubscriberSubscriptionsUseCase,
  ListTopicSubscriptionsUseCase,
  ListTopicsUseCase,
  UpdateTopicUseCase,
  UpsertTopicUseCase,
];
