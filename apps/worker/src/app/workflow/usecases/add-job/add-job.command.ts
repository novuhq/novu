import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { JobEntity } from '@novu/dal';
import { StatelessControls } from '@novu/shared';
import { IsDefined } from 'class-validator';

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  job: JobEntity;

  controls?: StatelessControls;
}
