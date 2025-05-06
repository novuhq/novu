import { IsNotEmpty } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetInviteCommand extends BaseCommand {
  @IsNotEmpty()
  readonly token: string;
}
