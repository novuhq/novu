import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

import { AgentIntegrationResponseDto } from './agent-integration-response.dto';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';

export class ListAgentIntegrationsQueryDto extends CursorPaginationQueryDto<
  AgentIntegrationResponseDto,
  'createdAt' | 'updatedAt' | '_id'
> {
  @ApiPropertyOptional({
    description: 'Return only links for this integration document id.',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  integrationId?: string;
}
