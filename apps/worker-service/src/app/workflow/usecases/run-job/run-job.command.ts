import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands';

export class RunJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;
}
