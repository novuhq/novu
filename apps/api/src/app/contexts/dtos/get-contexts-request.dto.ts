import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContextTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '../../subscribers-v2/dtos/cursor-pagination-query.dto';
import { GetContextResponseDto } from './get-context-response.dto';

export class GetContextsRequestDto extends CursorPaginationQueryDto<GetContextResponseDto, 'createdAt' | 'updatedAt'> {
  @ApiPropertyOptional({
    enum: ContextTypeEnum,
    description: 'Filter contexts by type',
  })
  @IsEnum(ContextTypeEnum)
  @IsOptional()
  type?: ContextTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter contexts by identifier pattern (supports partial matching)',
    example: 'tenant-prod',
  })
  @IsString()
  @IsOptional()
  identifier?: string;
}
