import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ControlsDto } from '@novu/shared';

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  job: JobEntity;

  controls?: ControlsDto;
}
