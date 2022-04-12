import { IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveSubscriberCommand extends EnvironmentCommand {
  static create(data: RemoveSubscriberCommand) {
    return CommandHelper.create(RemoveSubscriberCommand, data);
  }

  @IsString()
  subscriberId: string;
}
