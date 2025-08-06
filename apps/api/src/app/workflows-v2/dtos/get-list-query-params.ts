import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowStatusEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { LimitOffsetPaginationQueryDto } from '../../shared/dtos/limit-offset-pagination.dto';
import { WorkflowResponseDto } from './workflow-response.dto';

export class GetListQueryParamsDto extends LimitOffsetPaginationQueryDto(WorkflowResponseDto, [
  'createdAt',
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

  @ApiPropertyOptional({
    description: 'Filter workflows by tags',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter workflows by status',
    enum: WorkflowStatusEnum,
    enumName: 'WorkflowStatusEnum',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkflowStatusEnum, { each: true })
  status?: WorkflowStatusEnum[];
}
