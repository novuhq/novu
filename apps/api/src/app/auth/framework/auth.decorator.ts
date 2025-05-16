import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { BEARER_SWAGGER_SECURITY_NAME } from '@novu/application-generic';
import { isClerkEnabled } from '@novu/shared';
import { CommunityUserAuthGuard } from './community.user.auth.guard';

export function RequireAuthentication() {
  if (isClerkEnabled()) {
    // eslint-disable-next-line global-require
    const { RequireAuthentication: EERequireAuthentication } = require('@novu/ee-auth');

    return EERequireAuthentication();
  }

  return applyDecorators(UseGuards(CommunityUserAuthGuard), ApiBearerAuth(BEARER_SWAGGER_SECURITY_NAME));
}
