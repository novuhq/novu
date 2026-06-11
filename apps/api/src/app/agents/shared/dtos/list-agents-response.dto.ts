import { ApiPropertyOptional } from '@nestjs/swagger';
import { withCursorPagination } from '../../../shared/dtos/cursor-paginated-response';
import { AgentResponseDto } from './agent-response.dto';
import { AgentPlanUsageDto } from './plan-usage.dto';

export class ListAgentsResponseDto extends withCursorPagination(AgentResponseDto, {
  description: 'List of returned agents',
}) {
  @ApiPropertyOptional({
    type: AgentPlanUsageDto,
    description:
      'Cloud only. Active agent usage in this environment against the organization plan limit. Agents created ' +
      'beyond the limit are flagged with `exceedsPlanLimit` and will not respond to inbound messages.',
  })
  planUsage?: AgentPlanUsageDto;
}
