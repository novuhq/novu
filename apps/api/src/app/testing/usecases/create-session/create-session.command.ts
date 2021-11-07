import { CommandHelper } from '../../../shared/commands/command.helper';

export class CreateSessionCommand {
  static create(data: CreateSessionCommand) {
    return CommandHelper.create(CreateSessionCommand, data);
  }
}
