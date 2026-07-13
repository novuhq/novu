import { ForbiddenException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../../inbox/utils/keyless.constants';

export function isEnvironmentScopedAuthScheme(scheme: ApiAuthSchemeEnum): boolean {
  return scheme === ApiAuthSchemeEnum.API_KEY || scheme === ApiAuthSchemeEnum.KEYLESS;
}

export function assertEnvironmentScopedAccess(
  scheme: ApiAuthSchemeEnum,
  userEnvironmentId: string,
  requestedEnvironmentId?: string
): void {
  if (!isEnvironmentScopedAuthScheme(scheme)) {
    return;
  }

  if (requestedEnvironmentId && requestedEnvironmentId !== userEnvironmentId) {
    throw new ForbiddenException(
      'This authentication scheme is scoped to a single environment and cannot target a different `_environmentId`. ' +
        'Use credentials from the target environment, or authenticate with a session token.'
    );
  }
}

export function assertEnvironmentScopedAccessForValues(
  scheme: ApiAuthSchemeEnum,
  userEnvironmentId: string,
  values: Array<{ _environmentId: string }> | undefined
): void {
  if (!values?.length) {
    return;
  }

  for (const value of values) {
    assertEnvironmentScopedAccess(scheme, userEnvironmentId, value._environmentId);
  }
}

export function isResolvedKeylessAuthScheme(authScheme: string | undefined): boolean {
  return authScheme === ApiAuthSchemeEnum.KEYLESS;
}

export function isKeylessApplicationIdentifierHeader(value: string | undefined): boolean {
  return Boolean(value?.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}
