import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class GetMyProfileCommand extends AuthenticatedCommand {
  static create(data: GetMyProfileCommand) {
    return CommandHelper.create<GetMyProfileCommand>(GetMyProfileCommand, data);
  }
}
