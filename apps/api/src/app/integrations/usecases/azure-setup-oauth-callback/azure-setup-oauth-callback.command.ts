import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AzureSetupOauthCallbackCommand extends BaseCommand {
  @IsNotEmpty()
  @IsString()
  readonly state: string;

  @IsOptional()
  @IsString()
  readonly code?: string;

  @IsOptional()
  @IsString()
  readonly error?: string;

  @IsOptional()
  @IsString()
  readonly errorDescription?: string;
}
