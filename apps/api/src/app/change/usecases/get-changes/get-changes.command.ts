import { IsBoolean, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetChangesCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsBoolean()
  promoted: boolean;
}
