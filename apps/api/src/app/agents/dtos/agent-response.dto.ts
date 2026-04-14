import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
