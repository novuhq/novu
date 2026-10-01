import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';

export class WorkflowRunFiltersCommand extends EnvironmentWithUserCommand {
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
  @IsString()
  subscriptionId?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(DeliveryLifecycleStatusEnum), { each: true })
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum[];

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(DeliveryLifecycleDetail), { each: true })
  deliveryLifecycleDetail?: DeliveryLifecycleDetail[];
}

export class GetWorkflowRunsCommand extends WorkflowRunFiltersCommand {
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
