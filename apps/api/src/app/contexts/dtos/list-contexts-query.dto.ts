import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContextType } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { GetContextResponseDto } from './get-context-response.dto';

export class ListContextsQueryDto extends CursorPaginationQueryDto<GetContextResponseDto, 'createdAt' | 'updatedAt'> {
  @ApiPropertyOptional({
    description: 'Filter contexts by type',
    example: 'tenant',
  })
  @IsString()
  @IsOptional()
  type?: ContextType;

  @ApiPropertyOptional({
    description: 'Filter contexts by id',
    example: 'tenant-prod-123',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'Search contexts by type or id (supports partial matching across both fields)',
    example: 'tenant',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
