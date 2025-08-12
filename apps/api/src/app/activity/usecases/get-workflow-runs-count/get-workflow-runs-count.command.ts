import { EnvironmentWithUserCommand, WorkflowRunStatusEnum } from '@novu/application-generic';
import { IsArray, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class GetWorkflowRunsCountCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workflowIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriberIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(WorkflowRunStatusEnum), {
    each: true,
  })
  statuses?: WorkflowRunStatusEnum[];

  @IsOptional()
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
