import { IsDefined, IsOptional, IsString } from 'class-validator';

import { NotificationStepEntity, JobEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class ExecuteBridgeJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  environmentId: string;

  @IsDefined()
  @IsString()
  organizationId: string;

  @IsDefined()
  @IsString()
  userId: string;

  @IsDefined()
  @IsString()
  identifier: string;

  // MAYBE REMOVE
  @IsDefined()
  payload?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsOptional()
  compileContext?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides?: Record<string, Record<string, unknown>>;

  // MAYBE REMOVE
  @IsDefined()
  step?: NotificationStepEntity;

  // MAYBE REMOVE
  @IsString()
  @IsDefined()
  transactionId?: string;

  // MAYBE REMOVE
  @IsDefined()
  notificationId?: string;

  // MAYBE REMOVE
  @IsDefined()
  _templateId?: string;

  // MAYBE REMOVE
  @IsDefined()
  subscriberId?: string;

  // MAYBE REMOVE
  @IsDefined()
  _subscriberId?: string;

  @IsDefined()
  jobId: string;

  @IsOptional()
  events?: any[];

  @IsDefined()
  job: JobEntity;

  @IsOptional()
  variables?: any;
}
