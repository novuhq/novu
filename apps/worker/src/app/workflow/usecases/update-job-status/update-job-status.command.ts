import { EnvironmentLevelCommand } from '@novu/application-generic';
import { JobStatusEnum } from '@novu/dal';
import { IsDefined, IsOptional } from 'class-validator';

export class UpdateJobStatusCommand extends EnvironmentLevelCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  status: JobStatusEnum;

  @IsOptional()
  error?: any;
}
