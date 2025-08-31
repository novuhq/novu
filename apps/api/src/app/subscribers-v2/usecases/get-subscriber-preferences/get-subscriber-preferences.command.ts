import { WorkflowCriticalityEnum } from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberPreferencesCommand extends EnvironmentWithSubscriber {
  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  criticality: WorkflowCriticalityEnum = WorkflowCriticalityEnum.NON_CRITICAL;
}
