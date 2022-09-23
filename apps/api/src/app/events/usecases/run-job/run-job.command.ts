import { IsBoolean, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class RunJobCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  jobId: string;

  @IsBoolean()
  presend = false;
}
