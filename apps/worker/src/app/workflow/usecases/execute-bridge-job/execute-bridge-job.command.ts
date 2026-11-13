import { EnvironmentWithUserCommand, ICompileContext } from '@novu/application-generic';

import { EnvironmentEntity, JobEntity, NotificationTemplateEntity } from '@novu/dal';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class ExecuteBridgeJobCommand extends EnvironmentWithUserCommand {
  /** Carries the job and the cached workflow on every v2 step; ExecuteBridgeJob only reads them. */
  protected static readonly skipDeepTransform = true;

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

  @IsDefined()
  jobId: string;

  @IsDefined()
  job: JobEntity;

  @IsDefined()
  variables?: Partial<ICompileContext>;

  @IsOptional()
  workflow?: NotificationTemplateEntity;

  /** The environment, when the caller already loaded it (SendMessage). Omitted, it is fetched. */
  @IsOptional()
  environment?: EnvironmentEntity;
}
