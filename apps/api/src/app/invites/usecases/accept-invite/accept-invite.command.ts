import { IsString } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class AcceptInviteCommand extends AuthenticatedCommand {
  @IsString()
  readonly token: string;
}
