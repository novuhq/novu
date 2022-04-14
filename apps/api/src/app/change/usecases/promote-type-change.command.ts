import { IsDefined } from 'class-validator';
import { CommandHelper } from '../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';
import { IItem } from './create-change.command';

export class PromoteTypeChangeCommand extends EnvironmentWithUserCommand {
  static create(data: PromoteTypeChangeCommand) {
    return CommandHelper.create(PromoteTypeChangeCommand, data);
  }

  @IsDefined()
  item: IItem;
}
