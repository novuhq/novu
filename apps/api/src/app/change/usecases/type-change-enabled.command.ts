import { IsDefined } from 'class-validator';
import { CommandHelper } from '../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';
import { IItem } from './create-change.command';

export class TypeChangeEnabledCommand extends EnvironmentWithUserCommand {
  static create(data: TypeChangeEnabledCommand) {
    return CommandHelper.create(TypeChangeEnabledCommand, data);
  }

  @IsDefined()
  item: IItem;
}
