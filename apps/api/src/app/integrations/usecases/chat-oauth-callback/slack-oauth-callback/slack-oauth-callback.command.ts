import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class SlackOauthCallbackCommand extends BaseCommand {
  @IsNotEmpty()
  @IsString()
  readonly providerCode: string;

  @IsNotEmpty()
  @IsString()
  readonly state: string;
}
