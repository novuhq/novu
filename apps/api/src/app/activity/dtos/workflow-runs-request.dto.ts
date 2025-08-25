import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkflowRunStatusDtoEnum } from './shared.dto';

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
  @IsIn(Object.values(WorkflowRunStatusDtoEnum), { each: true })
  statuses?: WorkflowRunStatusDtoEnum[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  topicKey?: string;

  @IsOptional()
  @IsISO8601()
  createdGte?: string;

  @IsOptional()
  @IsISO8601()
  createdLte?: string;
}
