import { IsString } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class AcceptInviteCommand extends AuthenticatedCommand {
  static create(data: AcceptInviteCommand) {
    return CommandHelper.create(AcceptInviteCommand, data);
  }

  @IsString()
  readonly token: string;
}
