import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { TopicSubscriptionResponseDto } from './topic-subscription-response.dto';

export class ListTopicSubscriptionsResponseDto extends withCursorPagination(TopicSubscriptionResponseDto, {
  description: 'List of returned Topic Subscriptions',
}) {}
