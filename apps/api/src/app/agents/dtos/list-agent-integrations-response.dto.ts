import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { AgentIntegrationResponseDto } from './agent-integration-response.dto';

export class ListAgentIntegrationsResponseDto extends withCursorPagination(AgentIntegrationResponseDto, {
  description: 'List of agent–integration links',
}) {}
