import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';

export class GetInviteCommand extends BaseCommand {
  @IsNotEmpty()
  readonly token: string;
}
