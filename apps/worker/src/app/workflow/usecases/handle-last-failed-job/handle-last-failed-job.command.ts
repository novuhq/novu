import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class HandleLastFailedJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsDefined()
  error: Error;
}
