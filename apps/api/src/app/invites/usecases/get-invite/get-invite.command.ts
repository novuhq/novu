import { IsNotEmpty } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class GetInviteCommand {
  static create(data: GetInviteCommand) {
    return CommandHelper.create(GetInviteCommand, data);
  }

  @IsNotEmpty()
  readonly token: string;
}
