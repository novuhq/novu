import { ForbiddenException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../../inbox/utils/keyless.constants';

/** `Authorization: Internal <jwt>`: a short-lived token Novu's own backend mints to act as a member (EE only). */
export function isInternalAuthScheme(scheme: ApiAuthSchemeEnum | string | undefined): boolean {
  return scheme === ApiAuthSchemeEnum.INTERNAL;
}

/**
 * Internal tokens act as a member but are held by a service, so they must never read, create or
 * rotate API keys, even when the member's role would allow it.
 */
export function assertNotInternalAuthScheme(scheme: ApiAuthSchemeEnum): void {
  if (isInternalAuthScheme(scheme)) {
    throw new ForbiddenException('API keys cannot be read or changed with an Internal token.');
  }
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
