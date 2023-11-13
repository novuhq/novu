import { GetTopicSubscribersUseCase } from '@novu/application-generic';
import { AddSubscribersUseCase } from './add-subscribers';
import { CreateTopicUseCase } from './create-topic';
import { DeleteTopicUseCase } from './delete-topic/delete-topic.use-case';
import { FilterTopicsUseCase } from './filter-topics';
import { GetTopicUseCase } from './get-topic';
import { GetTopicSubscriberUseCase } from './get-topic-subscriber';
import { RemoveSubscribersUseCase } from './remove-subscribers';
import { RenameTopicUseCase } from './rename-topic';

export * from './add-subscribers';
export * from './create-topic';
export * from './delete-topic';
export * from './filter-topics';
export * from './get-topic';
export * from './get-topic-subscriber';
export * from './remove-subscribers';
export * from './rename-topic';

export const USE_CASES = [
  AddSubscribersUseCase,
  CreateTopicUseCase,
  DeleteTopicUseCase,
  FilterTopicsUseCase,
  GetTopicUseCase,
  GetTopicSubscriberUseCase,
  GetTopicSubscribersUseCase,
  RemoveSubscribersUseCase,
  RenameTopicUseCase,
];
