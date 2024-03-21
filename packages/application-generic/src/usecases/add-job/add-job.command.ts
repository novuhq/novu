import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';

import { EnvironmentWithUserCommand } from '../../commands';

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  job: JobEntity;

  chimeraResponse?: any;
}
