import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_SWAGGER_SECURITY_NAME = 'secretKey';
export const BEARER_SWAGGER_SECURITY_NAME = 'bearerAuth';

export function ExternalApiAccessible() {
  return applyDecorators(
    SetMetadata('external_api_accessible', true),
    ApiSecurity(API_KEY_SWAGGER_SECURITY_NAME),
  );
}
