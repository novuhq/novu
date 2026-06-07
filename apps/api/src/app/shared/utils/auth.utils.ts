import { ApiAuthSchemeEnum } from '@novu/shared';

import { KEYLESS_ENVIRONMENT_PREFIX } from '../../inbox/utils/keyless.constants';

/** Auth schemes that are pinned to a single environment (API key and keyless). */
export function isEnvironmentScopedAuthScheme(scheme: ApiAuthSchemeEnum): boolean {
  return scheme === ApiAuthSchemeEnum.API_KEY || scheme === ApiAuthSchemeEnum.KEYLESS;
}

/**
 * True when the resolved request auth scheme is keyless. Prefer this over
 * inspecting client headers — a spoofed `Novu-Application-Identifier` must not
 * change rate limits for an authenticated API-key caller.
 */
export function isResolvedKeylessAuthScheme(authScheme: string | undefined): boolean {
  return authScheme === ApiAuthSchemeEnum.KEYLESS;
}

/**
 * True when a header value is a keyless application identifier (`pk_keyless_*`).
 * Used only for unauthenticated routes (e.g. inbox session bootstrap) where no
 * resolved auth scheme exists yet.
 */
export function isKeylessApplicationIdentifierHeader(value: string | undefined): boolean {
  return Boolean(value?.startsWith(KEYLESS_ENVIRONMENT_PREFIX));
}
