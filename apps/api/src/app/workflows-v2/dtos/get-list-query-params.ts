import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { LimitOffsetPaginationQueryDto } from './limit-offset-pagination.dto';
import { WorkflowResponseDto } from './workflow-response.dto';

export class GetListQueryParamsDto extends LimitOffsetPaginationQueryDto(WorkflowResponseDto, [
  'updatedAt',
  'name',
  'lastTriggeredAt',
]) {
  @ApiPropertyOptional({
    description: 'Search query to filter workflows',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;
}
