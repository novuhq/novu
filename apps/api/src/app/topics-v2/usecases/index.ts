import { DeleteTopicUseCase } from './delete-topic/delete-topic.usecase';
import { GetTopicUseCase } from './get-topic/get-topic.usecase';
import { ListTopicSubscriptionsUseCase } from './list-topic-subscriptions/list-topic-subscriptions.usecase';
import { ListTopicsUseCase } from './list-topics/list-topics.usecase';
import { UpdateTopicUseCase } from './update-topic/update-topic.usecase';
import { UpsertTopicUseCase } from './upsert-topic/upsert-topic.usecase';

export const USE_CASES = [
  DeleteTopicUseCase,
  GetTopicUseCase,
  ListTopicSubscriptionsUseCase,
  ListTopicsUseCase,
  UpdateTopicUseCase,
  UpsertTopicUseCase,
];
