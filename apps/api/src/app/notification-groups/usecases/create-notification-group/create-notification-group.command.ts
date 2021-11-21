import { IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class CreateNotificationGroupCommand extends ApplicationWithUserCommand {
  static create(data: CreateNotificationGroupCommand) {
    return CommandHelper.create<CreateNotificationGroupCommand>(CreateNotificationGroupCommand, data);
  }

  @IsString()
  name: string;
}
