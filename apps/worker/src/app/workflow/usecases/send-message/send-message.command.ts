import { EnvironmentWithUserCommand } from '@novu/application-generic';
import type { JobEntity, NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import type { SeverityLevelEnum, TriggerOverrides, WorkflowPreferences } from '@novu/shared';
import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class SendMessageCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsDefined()
  overrides: TriggerOverrides;

  @IsDefined()
  step: NotificationStepEntity;

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  notificationId: string;

  @IsOptional()
  _templateId?: string;

  @IsDefined()
  subscriberId: string;

  @IsDefined()
  _subscriberId: string;

  @IsDefined()
  jobId: string;

  @IsOptional()
  events?: any[];

  @IsDefined()
  job: JobEntity;

  @IsDefined()
  tags: string[];

  @IsOptional()
  severity?: SeverityLevelEnum;

  @IsOptional()
  statelessPreferences?: WorkflowPreferences;

  @IsArray()
  @IsString({ each: true })
  contextKeys: string[];

  @IsOptional()
  workflow?: NotificationTemplateEntity;
}
