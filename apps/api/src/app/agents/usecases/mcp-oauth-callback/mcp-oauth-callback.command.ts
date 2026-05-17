import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class McpOAuthCallbackCommand extends BaseCommand {
  @IsNotEmpty()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  providerCode?: string;

  @IsOptional()
  @IsString()
  error?: string;
}

export type McpOAuthCallbackResult = {
  redirectUrl?: string;
  status: 'connected' | 'error';
  message?: string;
};
