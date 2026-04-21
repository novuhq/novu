import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { AgentResponseDto } from './agent-response.dto';

export class ListAgentsResponseDto extends withCursorPagination(AgentResponseDto, {
  description: 'List of returned agents',
}) {}
