import type { OrganizationPublicMetadata } from '../types';

export type MfaEnforcementSessionClaims = {
  requireMfa?: boolean;
  isMfaEnabled?: boolean;
};

export function readOrgRequireMfa(metadata?: OrganizationPublicMetadata | Record<string, unknown> | null): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  return (metadata as OrganizationPublicMetadata).requireMfa === true;
}

export function readMfaEnforcementFromSessionClaims(
  claims?: MfaEnforcementSessionClaims | Record<string, unknown> | null
): { requireMfa: boolean; isMfaEnabled: boolean } {
  if (!claims || typeof claims !== 'object') {
    return { requireMfa: false, isMfaEnabled: false };
  }

  const requireMfa = claims.requireMfa === true;
  const isMfaEnabled = claims.isMfaEnabled === true;

  return { requireMfa, isMfaEnabled };
}

export function isMfaEnforcementBlocking(requireMfa: boolean, isMfaEnabled: boolean): boolean {
  return requireMfa && !isMfaEnabled;
}

export function resolveMfaEnforcementState({
  sessionClaims,
  organizationPublicMetadata,
  userTwoFactorEnabled,
}: {
  sessionClaims?: MfaEnforcementSessionClaims | Record<string, unknown> | null;
  organizationPublicMetadata?: OrganizationPublicMetadata | Record<string, unknown> | null;
  userTwoFactorEnabled?: boolean;
}): { requireMfa: boolean; isMfaEnabled: boolean; isBlocked: boolean } {
  const claims = readMfaEnforcementFromSessionClaims(sessionClaims);
  const requireMfa = claims.requireMfa || readOrgRequireMfa(organizationPublicMetadata);
  const isMfaEnabled = claims.isMfaEnabled || userTwoFactorEnabled === true;

  return {
    requireMfa,
    isMfaEnabled,
    isBlocked: isMfaEnforcementBlocking(requireMfa, isMfaEnabled),
  };
}
