import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class SetJobAsCommand extends EnvironmentCommand {
  @IsDefined()
  _jobId: string;
}

export class SetJobAsFailedCommand extends SetJobAsCommand {}
