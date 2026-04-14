import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { AgentResponseDto } from './agent-response.dto';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';

export class ListAgentsQueryDto extends CursorPaginationQueryDto<AgentResponseDto, 'createdAt' | 'updatedAt' | '_id'> {
  @ApiPropertyOptional({
    description: 'Filter agents by partial, case-insensitive match on identifier.',
    type: String,
  })
  @IsOptional()
  @IsString()
  identifier?: string;
}
