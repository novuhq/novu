import { SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';

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
  statuses?: WorkflowRunStatusDtoEnum[];

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(Object.values(SeverityLevelEnum), { each: true })
  severity?: SeverityLevelEnum[];
}
