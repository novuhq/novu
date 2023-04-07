import { IsDefined, IsOptional } from 'class-validator';
import { JobStatusEnum } from '@novu/dal';
import { EnvironmentCommand } from '@novu/application-generic';

export class UpdateJobStatusCommand extends EnvironmentCommand {
  @IsDefined()
  _jobId: string;

  @IsDefined()
  status: JobStatusEnum;

  @IsOptional()
  error?: any;
}
