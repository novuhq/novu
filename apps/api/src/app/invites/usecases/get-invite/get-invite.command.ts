import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty } from 'class-validator';

export class GetInviteCommand extends BaseCommand {
  @IsNotEmpty()
  readonly token: string;
}
