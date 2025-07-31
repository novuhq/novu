import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { JobEntity, NotificationStepEntity } from '@novu/dal';
import { ExecuteOutput } from '@novu/framework/internal';
import { TriggerOverrides, WorkflowPreferences } from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class SendMessageCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsOptional()
  compileContext?: any;

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

  @IsOptional()
  bridgeData?: ExecuteOutput | null;

  @IsDefined()
  tags: string[];

  @IsOptional()
  statelessPreferences?: WorkflowPreferences;
}
