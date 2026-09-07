import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { TopicResponseDto } from './topic-response.dto';

export class ListTopicsResponseDto extends withCursorPagination(TopicResponseDto, {
  description: 'List of returned Topics',
}) {}
