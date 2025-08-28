import { WorkflowCriticalityEnum } from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class GetSubscriberPreferencesRequestDto {
  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  criticality: WorkflowCriticalityEnum = WorkflowCriticalityEnum.NON_CRITICAL;
}
