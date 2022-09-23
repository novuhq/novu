import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class AddJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;
}
