import { ApiPropertyOptional } from '@nestjs/swagger';
import { withCursorPagination } from '../../../shared/dtos/cursor-paginated-response';
import { AgentIntegrationResponseDto } from './agent-integration-response.dto';
import { PlanUsageDto } from './plan-usage.dto';

export class ListAgentIntegrationsResponseDto extends withCursorPagination(AgentIntegrationResponseDto, {
  description: 'List of agent–integration links',
}) {
  @ApiPropertyOptional({
    type: PlanUsageDto,
    description:
      'Cloud only. Organization-wide connected channel usage against the plan limit. Channels connected beyond ' +
      'the limit are flagged with `exceedsPlanLimit` and will not respond to inbound messages.',
  })
  planUsage?: PlanUsageDto;
}
