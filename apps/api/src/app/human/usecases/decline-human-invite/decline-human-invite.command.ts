import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeclineHumanInviteCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;
}
