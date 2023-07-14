import { IsDefined, IsOptional } from 'class-validator';
import { JobStatusEnum } from '@novu/dal';
import { EnvironmentLevelCommand } from '@novu/application-generic';

export class UpdateJobStatusCommand extends EnvironmentLevelCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  status: JobStatusEnum;

  @IsOptional()
  error?: any;
}
