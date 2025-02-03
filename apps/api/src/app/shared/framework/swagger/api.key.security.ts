import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { BEARER_SWAGGER_SECURITY_NAME, UserAuthGuard } from '@novu/application-generic';

export function UserAuthentication() {
  return applyDecorators(UseGuards(UserAuthGuard), ApiBearerAuth(BEARER_SWAGGER_SECURITY_NAME));
}
