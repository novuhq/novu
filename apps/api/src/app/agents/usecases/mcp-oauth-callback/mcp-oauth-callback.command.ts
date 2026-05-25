import { BaseCommand } from '@novu/application-generic';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * `setup_action` values that GitHub returns on the install-and-authorize
 * redirect. Other values are rejected at the controller boundary so a
 * malformed redirect can't widen this union accidentally.
 *
 * - `install` — fresh installation just created.
 * - `update`  — existing installation had its repo selection updated.
 * - `request` — user picked an org they don't admin; install is pending
 *               an org-owner approval. Token still gets issued but the
 *               grant is effectively empty until approval lands.
 */
export type McpOAuthSetupAction = 'install' | 'update' | 'request';

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

  /**
   * GitHub-App-only: numeric installation id returned alongside `code` when
   * the catalog entry uses the install-and-authorize redirect. Carried as a
   * string off the querystring; the callback parses it to a number before
   * persisting to keep the entity field strict.
   */
  @IsOptional()
  @IsString()
  installationId?: string;

  /**
   * GitHub-App-only: `setup_action` returned alongside `code`. Whitelisted
   * here so an unrecognised value is rejected before the callback runs.
   */
  @IsOptional()
  @IsIn(['install', 'update', 'request'])
  setupAction?: McpOAuthSetupAction;
}

export type McpOAuthCallbackResult = {
  redirectUrl?: string;
  status: 'connected' | 'error';
  message?: string;
};
