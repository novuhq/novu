/**
 * @novu/ee-auth - Stub Package for ReNovu (Self-Hosted)
 *
 * This is a placeholder package that satisfies the dependency requirement
 * for @novu/ee-auth in the ReNovu self-hosted distribution.
 *
 * Enterprise authentication is NOT available in ReNovu.
 * This stub ensures pnpm can resolve dependencies while the actual
 * enterprise auth code is not included.
 *
 * The actual auth module selection happens in apps/api/src/app/auth/auth.module.ts
 * based on environment variables (NOVU_ENTERPRISE, EE_AUTH_PROVIDER).
 * For self-hosted, the community auth module is used instead.
 */

import { MiddlewareConsumer, ModuleMetadata } from '@nestjs/common';

const STUB_ERROR_MESSAGE =
  'Enterprise authentication is not available in ReNovu (self-hosted). ' +
  'This stub package should not be called at runtime. ' +
  'Please ensure NOVU_ENTERPRISE is not set to "true".';

/**
 * Stub eeAuthModule - returns empty arrays
 *
 * This should never be called in ReNovu because:
 * - isClerkEnabled() returns false (NOVU_ENTERPRISE not set)
 * - isBetterAuthEnabled() returns false (NOVU_ENTERPRISE not set)
 * - auth.module.ts uses getCommunityAuthModuleConfig() instead
 */
export const eeAuthModule: ModuleMetadata & {
  imports: any[];
  controllers: any[];
  providers: any[];
  exports: any[];
} = {
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
};

/**
 * Stub configure function - throws if accidentally used
 */
export function configure(_consumer: MiddlewareConsumer): void {
  throw new Error(STUB_ERROR_MESSAGE);
}

/**
 * Stub injectEEAuthProviders - throws if accidentally used
 *
 * Used in shared.module.ts when isClerkEnabled() is true.
 * For ReNovu, this should never be called.
 */
export function injectEEAuthProviders(): any[] {
  throw new Error(STUB_ERROR_MESSAGE);
}

/**
 * Stub RequireAuthentication decorator - throws if accidentally used
 *
 * Used in auth.decorator.ts when isEEAuthEnabled() is true.
 * For ReNovu, this should never be called.
 */
export function RequireAuthentication(): any {
  throw new Error(STUB_ERROR_MESSAGE);
}
