import { GetTopicUseCase } from './get-topic/get-topic.usecase';
import { ListTopicsUseCase } from './list-topics/list-topics.usecase';
import { UpsertTopicUseCase } from './upsert-topic/upsert-topic.usecase';

export const USE_CASES = [GetTopicUseCase, ListTopicsUseCase, UpsertTopicUseCase];
