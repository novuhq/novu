import { WorkflowRunStatus } from '@novu/application-generic';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsInt, Min, Max, IsISO8601, IsIn } from 'class-validator';

export class GetWorkflowRunsRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  workflowIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  subscriberIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @IsIn(['pending', 'running', 'completed', 'failed', 'cancelled'] satisfies WorkflowRunStatus[], { each: true })
  statuses?: WorkflowRunStatus[];

  @IsOptional()
  @IsISO8601()
  createdGte?: string;

  @IsOptional()
  @IsISO8601()
  createdLte?: string;
}
