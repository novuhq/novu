import { EnvironmentCommand, WorkflowRunStatusEnum } from '@novu/application-generic';
import { IsArray, IsDate, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';

export class BuildWorkflowRunsCountChartCommand extends EnvironmentCommand {
  @IsDate()
  @IsDefined()
  startDate: Date;

  @IsDate()
  @IsDefined()
  endDate: Date;

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
  @IsIn(Object.values(WorkflowRunStatusDtoEnum), {
    each: true,
  })
  statuses?: WorkflowRunStatusDtoEnum[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  topicKey?: string;
}
