import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class RunJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;
}
