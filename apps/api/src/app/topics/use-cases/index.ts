import { CreateTopicUseCase } from './create-topic/create-topic.use-case';
import { FilterTopicsUseCase } from './filter-topics/filter-topics.use-case';
import { GetTopicUseCase } from './get-topic/get-topic.use-case';

export * from './create-topic';
export * from './filter-topics';
export * from './get-topic';

export const USE_CASES = [CreateTopicUseCase, FilterTopicsUseCase, GetTopicUseCase];
