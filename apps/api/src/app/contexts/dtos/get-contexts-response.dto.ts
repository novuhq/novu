import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { GetContextResponseDto } from './get-context-response.dto';

export class GetContextsResponseDto extends withCursorPagination(GetContextResponseDto, {
  description: 'List of returned Contexts',
}) {}
