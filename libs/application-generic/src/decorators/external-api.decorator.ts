import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_SWAGGER_SECURITY_NAME = 'secretKey';
export const BEARER_SWAGGER_SECURITY_NAME = 'bearerAuth';

export const OAUTH_ACCESSIBLE_METADATA_KEY = 'oauth_accessible';

export function ExternalApiAccessible() {
  return applyDecorators(SetMetadata('external_api_accessible', true), ApiSecurity(API_KEY_SWAGGER_SECURITY_NAME));
}

/**
 * Marks an endpoint as accessible via a Clerk OAuth (DCR) access token.
 * Mirrors `ExternalApiAccessible`, but gates the OAuth bearer path enforced in
 * the EE user auth guard. Only opted-in endpoints accept OAuth tokens.
 */
export function OAuthAccessible() {
  return applyDecorators(
    SetMetadata(OAUTH_ACCESSIBLE_METADATA_KEY, true),
    ApiSecurity(BEARER_SWAGGER_SECURITY_NAME)
  );
}
