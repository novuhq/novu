import { EnvironmentCommand } from '@novu/application-generic';
import { IsArray, IsDateString, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportTypeEnum, WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';

export class GetChartsCommand extends EnvironmentCommand {
  @IsDateString()
  @IsOptional()
  createdAtGte?: string;

  @IsDateString()
  @IsOptional()
  createdAtLte?: string;

  @IsEnum(ReportTypeEnum, { each: true })
  @IsDefined()
  @IsArray()
  reportType: ReportTypeEnum[];

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
  @IsEnum(WorkflowRunStatusDtoEnum, { each: true })
  statuses?: WorkflowRunStatusDtoEnum[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  topicKey?: string;
}
