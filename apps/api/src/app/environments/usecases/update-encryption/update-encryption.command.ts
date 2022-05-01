import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateEncryptionCommand extends EnvironmentCommand {
  static create(data: UpdateEncryptionCommand) {
    return CommandHelper.create(UpdateEncryptionCommand, data);
  }

  encrypted: string;
}
