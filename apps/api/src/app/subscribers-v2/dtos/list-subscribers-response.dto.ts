import { SubscriberResponseDto } from '../../subscribers/dtos';
import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';

export class ListSubscribersResponseDto extends withCursorPagination(SubscriberResponseDto, {
  description: 'List of returned Subscribers',
}) {}
