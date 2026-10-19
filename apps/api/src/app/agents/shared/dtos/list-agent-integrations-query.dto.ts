import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { AgentIntegrationResponseDto } from './agent-integration-response.dto';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';

export class ListAgentIntegrationsQueryDto extends CursorPaginationQueryDto<
  AgentIntegrationResponseDto,
  'createdAt' | 'updatedAt' | '_id'
> {
  @ApiPropertyOptional({
    description: 'Return only links for this integration identifier (not the internal document _id).',
    type: String,
  })
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;
}
