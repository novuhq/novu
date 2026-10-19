import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { DomainRouteResponseDto } from './domain-route-response.dto';

export class ListDomainRoutesResponseDto extends withCursorPagination(DomainRouteResponseDto, {
  description: 'List of returned domain routes',
}) {}
