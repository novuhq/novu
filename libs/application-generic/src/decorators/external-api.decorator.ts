import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_SWAGGER_SECURITY_NAME = 'secretKey';
export const BEARER_SWAGGER_SECURITY_NAME = 'bearerAuth';

export const OAUTH_ACCESSIBLE_METADATA_KEY = 'oauth_accessible';

export function ExternalApiAccessible() {
  return applyDecorators(SetMetadata('external_api_accessible', true), ApiSecurity(API_KEY_SWAGGER_SECURITY_NAME));
}

export function OAuthAccessible() {
  return applyDecorators(
    SetMetadata(OAUTH_ACCESSIBLE_METADATA_KEY, true),
    ApiSecurity(BEARER_SWAGGER_SECURITY_NAME)
  );
}
