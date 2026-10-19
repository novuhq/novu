import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { DomainResponseDto } from './domain-response.dto';

export class ListDomainsResponseDto extends withCursorPagination(DomainResponseDto, {
  description: 'List of returned domains',
}) {}
