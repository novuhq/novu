import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WorkflowRunStatsGroupByEnum } from './shared.dto';
import { WorkflowRunFiltersRequestDto } from './workflow-runs-request.dto';

export class GetWorkflowRunStatsRequestDto extends WorkflowRunFiltersRequestDto {
  @ApiPropertyOptional({
    enum: WorkflowRunStatsGroupByEnum,
    description: 'Optional dimension to group counts by. Omit for totals only.',
  })
  @IsOptional()
  @IsEnum(WorkflowRunStatsGroupByEnum)
  groupBy?: WorkflowRunStatsGroupByEnum;
}

export class WorkflowRunStatsBucketDto {
  @ApiProperty({ description: 'Group key for this bucket' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Number of workflow runs in this bucket' })
  @IsInt()
  @Min(0)
  count: number;

  @ApiProperty({ description: 'Number of unique subscribers in this bucket' })
  @IsInt()
  @Min(0)
  uniqueSubscribers: number;
}

export class GetWorkflowRunStatsResponseDto {
  @ApiProperty({ description: 'Total matching workflow runs after filters' })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({ description: 'Unique subscribers across matching workflow runs' })
  @IsInt()
  @Min(0)
  uniqueSubscribers: number;

  @ApiPropertyOptional({
    enum: WorkflowRunStatsGroupByEnum,
    nullable: true,
    description: 'Dimension used to produce buckets, or null when ungrouped',
  })
  @IsOptional()
  groupBy: WorkflowRunStatsGroupByEnum | null;

  @ApiProperty({ description: 'Grouped counts, empty when groupBy is omitted', type: [WorkflowRunStatsBucketDto] })
  @Type(() => WorkflowRunStatsBucketDto)
  @IsArray()
  buckets: WorkflowRunStatsBucketDto[];
}
