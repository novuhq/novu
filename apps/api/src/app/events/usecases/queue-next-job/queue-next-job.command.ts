import { IsDefined } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class QueueNextJobCommand extends EnvironmentWithUserCommand {
  static create(data: QueueNextJobCommand) {
    return CommandHelper.create(QueueNextJobCommand, data);
  }

  @IsDefined()
  parentId: string;
}
