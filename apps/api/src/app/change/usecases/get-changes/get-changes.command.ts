import { IsBoolean, IsDefined } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetChangesCommand extends EnvironmentWithUserCommand {
  static create(data: GetChangesCommand) {
    return CommandHelper.create(GetChangesCommand, data);
  }

  @IsDefined()
  @IsBoolean()
  promoted: boolean;
}
