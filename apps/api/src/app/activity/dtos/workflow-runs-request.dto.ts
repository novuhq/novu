import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkflowRunStatusDtoEnum } from './shared.dto';

export class WorkflowRunFiltersRequestDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by workflow identifiers',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  workflowIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by subscriber identifiers',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  subscriberIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by transaction identifiers',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[];

  @ApiPropertyOptional({
    enum: WorkflowRunStatusDtoEnum,
    isArray: true,
    description: 'Filter by workflow run status',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(WorkflowRunStatusDtoEnum), { each: true })
  statuses?: WorkflowRunStatusDtoEnum[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by channel types',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by topic key',
  })
  @IsOptional()
  @IsString()
  topicKey?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by subscription identifier',
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter for records created at or after this ISO-8601 timestamp',
  })
  @IsOptional()
  @IsISO8601()
  createdGte?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter for records created at or before this ISO-8601 timestamp',
  })
  @IsOptional()
  @IsISO8601()
  createdLte?: string;

  @ApiPropertyOptional({
    enum: SeverityLevelEnum,
    isArray: true,
    description: 'Filter by severity',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(SeverityLevelEnum), { each: true })
  severity?: SeverityLevelEnum[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by exact context keys, order insensitive (format: "type:id")',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;

    if (value === '') return [];

    const array = Array.isArray(value) ? value : [value];

    return array.filter((v) => v !== '');
  })
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @ApiPropertyOptional({
    enum: DeliveryLifecycleStatusEnum,
    isArray: true,
    description: 'Filter by delivery lifecycle status',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(DeliveryLifecycleStatusEnum), { each: true })
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum[];

  @ApiPropertyOptional({
    enum: DeliveryLifecycleDetail,
    isArray: true,
    description: 'Filter by delivery lifecycle detail (skip or failure reason)',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(DeliveryLifecycleDetail), { each: true })
  deliveryLifecycleDetail?: DeliveryLifecycleDetail[];
}

export class GetWorkflowRunsRequestDto extends WorkflowRunFiltersRequestDto {
  @ApiPropertyOptional({
    type: Number,
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Page size for cursor pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    type: String,
    description: 'Cursor for the next or previous page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
