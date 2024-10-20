import { IsDefined, IsOptional, IsString } from 'class-validator';
import { NotificationStepEntity, JobEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ExecuteOutput } from '@novu/framework/internal';
import { WorkflowPreferences } from '@novu/shared';

export class SendMessageCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsOptional()
  compileContext?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

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
