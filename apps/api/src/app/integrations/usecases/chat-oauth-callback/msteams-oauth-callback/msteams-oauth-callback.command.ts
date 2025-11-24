import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MsTeamsOauthCallbackCommand extends BaseCommand {
  @IsNotEmpty()
  @IsString()
  readonly tenant: string;

  @IsOptional()
  @IsString()
  readonly adminConsent?: string;

  @IsNotEmpty()
  @IsString()
  readonly state: string;
}
