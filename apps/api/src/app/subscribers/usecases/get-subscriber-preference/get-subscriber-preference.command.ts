import { EnvironmentWithSubscriber } from '@novu/application-generic';
import { SubscriberEntity } from '@novu/dal';
import { SeverityLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SeverityLevelEnum, { each: true })
  severity?: SeverityLevelEnum[];

  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;

  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  criticality: WorkflowCriticalityEnum;

  @IsOptional()
  subscriber?: SubscriberEntity;
}
