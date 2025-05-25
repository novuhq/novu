import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class ProcessUnsnoozeJobCommand extends EnvironmentCommand {
  @IsDefined()
  jobId: string;
}
