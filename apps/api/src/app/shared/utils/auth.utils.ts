import { ForbiddenException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../../inbox/utils/keyless.constants';

/** `Authorization: Internal <jwt>`: a short-lived token Novu's own backend mints to act as a member (EE only). */
export function isInternalAuthScheme(scheme: string | undefined): boolean {
  return scheme === ApiAuthSchemeEnum.INTERNAL;
}

export function isEnvironmentScopedAuthScheme(scheme: ApiAuthSchemeEnum): boolean {
  // An `Internal` token is minted for one environment, so it cannot be pointed at another.
  return scheme === ApiAuthSchemeEnum.API_KEY || scheme === ApiAuthSchemeEnum.KEYLESS || isInternalAuthScheme(scheme);
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
