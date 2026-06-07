import { ApiAuthSchemeEnum } from '@novu/shared';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../../inbox/utils/keyless.constants';

export function isEnvironmentScopedAuthScheme(scheme: ApiAuthSchemeEnum): boolean {
  return scheme === ApiAuthSchemeEnum.API_KEY || scheme === ApiAuthSchemeEnum.KEYLESS;
}

export function isResolvedKeylessAuthScheme(authScheme: string | undefined): boolean {
  return authScheme === ApiAuthSchemeEnum.KEYLESS;
}

export function isKeylessApplicationIdentifierHeader(value: string | undefined): boolean {
  return Boolean(value?.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}
