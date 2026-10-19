import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../subscribers-v2/dtos/cursor-pagination-query.dto';
import { DomainRouteResponseDto } from './domain-route-response.dto';

export class ListDomainRoutesQueryDto extends CursorPaginationQueryDto<DomainRouteResponseDto, 'updatedAt' | '_id'> {
  @ApiPropertyOptional({
    description: 'Agent identifier to filter routes by.',
    type: String,
  })
  @IsOptional()
  @IsString()
  agentId?: string;
}
