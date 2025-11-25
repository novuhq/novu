import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatOauthCallbackCommand extends BaseCommand {
  @IsOptional()
  @IsString()
  readonly providerCode?: string;

  @IsOptional()
  @IsString()
  readonly tenant?: string;

  @IsOptional()
  @IsString()
  readonly adminConsent?: string;

  @IsNotEmpty()
  @IsString()
  readonly state: string;
}
