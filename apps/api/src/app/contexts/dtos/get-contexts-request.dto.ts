import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContextType } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../subscribers-v2/dtos/cursor-pagination-query.dto';
import { GetContextResponseDto } from './get-context-response.dto';

export class GetContextsRequestDto extends CursorPaginationQueryDto<GetContextResponseDto, 'createdAt' | 'updatedAt'> {
  @ApiPropertyOptional({
    description: 'Filter contexts by type',
    example: 'tenant',
  })
  @IsString()
  @IsOptional()
  type?: ContextType;

  @ApiPropertyOptional({
    description: 'Filter contexts by id pattern (supports partial matching)',
    example: 'tenant-prod',
  })
  @IsString()
  @IsOptional()
  id?: string;
}
