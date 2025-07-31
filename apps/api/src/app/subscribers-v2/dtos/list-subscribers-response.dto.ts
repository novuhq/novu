import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { SubscriberResponseDto } from '../../subscribers/dtos';

export class ListSubscribersResponseDto extends withCursorPagination(SubscriberResponseDto, {
  description: 'List of returned Subscribers',
}) {}
