import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_SWAGGER_SECURITY_NAME = 'api-key';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ExternalApiAccessible() {
  return applyDecorators(
    SetMetadata('external_api_accessible', true),
    ApiSecurity(API_KEY_SWAGGER_SECURITY_NAME)
  );
}
