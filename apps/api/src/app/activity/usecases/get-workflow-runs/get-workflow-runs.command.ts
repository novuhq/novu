import { IsArray, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkflowRunStatusEnum } from '@novu/application-generic';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowRunsCommand extends EnvironmentWithUserCommand {
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsOptional()
  @IsString()
  cursor?: string;

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
  statuses?: WorkflowRunStatusEnum[];

  @IsOptional()
  @IsISO8601()
  createdGte?: string;

  @IsOptional()
  @IsISO8601()
  createdLte?: string;
}
