import { AddSubscribersUseCase } from './add-subscribers/add-subscribers.use-case';
import { CreateTopicUseCase } from './create-topic/create-topic.use-case';
import { CreateTopicSubscribersUseCase } from './create-topic-subscribers/create-topic-subscribers.use-case';
import { FilterTopicsUseCase } from './filter-topics/filter-topics.use-case';
import { GetTopicUseCase } from './get-topic/get-topic.use-case';
import { GetTopicSubscribersUseCase } from './get-topic-subscribers/get-topic-subscribers.use-case';
import { RemoveSubscribersUseCase } from './remove-subscribers/remove-subscribers.use-case';

export * from './add-subscribers';
export * from './create-topic';
export * from './filter-topics';
export * from './get-topic';
export * from './get-topic-subscribers';
export * from './remove-subscribers';

export const USE_CASES = [
  AddSubscribersUseCase,
  CreateTopicUseCase,
  CreateTopicSubscribersUseCase,
  FilterTopicsUseCase,
  GetTopicUseCase,
  GetTopicSubscribersUseCase,
  RemoveSubscribersUseCase,
];
