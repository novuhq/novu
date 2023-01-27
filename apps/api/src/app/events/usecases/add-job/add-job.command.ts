import { IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { JobEntity } from '@novu/dal';

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsOptional()
  job?: JobEntity;
}
