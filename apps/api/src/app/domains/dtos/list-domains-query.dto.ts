import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../subscribers-v2/dtos/cursor-pagination-query.dto';
import { DomainResponseDto } from './domain-response.dto';

export class ListDomainsQueryDto extends CursorPaginationQueryDto<DomainResponseDto, 'updatedAt' | '_id'> {
  @ApiPropertyOptional({
    description: 'Domain name to filter results by.',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
