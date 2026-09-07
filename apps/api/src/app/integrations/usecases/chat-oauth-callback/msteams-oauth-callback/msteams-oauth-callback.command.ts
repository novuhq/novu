import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MsTeamsOauthCallbackCommand extends BaseCommand {
  @IsOptional()
  @IsString()
  readonly tenant?: string;

  @IsOptional()
  @IsString()
  readonly adminConsent?: string;

  @IsOptional()
  @IsString()
  readonly providerCode?: string;

  @IsNotEmpty()
  @IsString()
  readonly state: string;
}
