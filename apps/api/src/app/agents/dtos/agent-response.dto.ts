import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AgentBehaviorDto } from './agent-behavior.dto';
import { AgentIntegrationSummaryDto } from './agent-integration-summary.dto';

export class AgentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: AgentBehaviorDto })
  behavior?: AgentBehaviorDto;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: [AgentIntegrationSummaryDto] })
  integrations?: AgentIntegrationSummaryDto[];
}
