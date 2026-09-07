import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowResponseDto } from '@novu/application-generic';
import { WorkflowStatusEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { LimitOffsetPaginationQueryDto } from '../../shared/dtos/limit-offset-pagination.dto';

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
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
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
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(WorkflowStatusEnum, { each: true })
  status?: WorkflowStatusEnum[];
}
