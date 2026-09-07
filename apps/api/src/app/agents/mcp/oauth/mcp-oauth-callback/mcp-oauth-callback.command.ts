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

  /**
   * RFC 9207 `iss` parameter from the authorization response. The MCP spec
   * requires validation against the issuer recorded at authorize-URL time
   * (see {@link McpOAuthCallback}). Absence is also significant when the AS
   * advertised `authorization_response_iss_parameter_supported: true`.
   */
  @IsOptional()
  @IsString()
  iss?: string;
}

export type McpOAuthCallbackResult = {
  redirectUrl?: string;
  status: 'connected' | 'error';
  message?: string;
};
