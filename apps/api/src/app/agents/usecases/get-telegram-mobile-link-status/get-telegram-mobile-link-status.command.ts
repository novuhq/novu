import { IsNotEmpty, IsString } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetTelegramMobileLinkStatusCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;
}
