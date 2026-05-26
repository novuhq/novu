import { OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';

const AUTO_CREATE_SESSION_GUARD_KEY = 'novu.connect.autoCreate';

type ConnectAutoCreateGuard = {
  userId: string;
  organizationId: string;
};

export type ConnectMembershipCandidate = {
  organization: {
    id: string;
    name: string;
    publicMetadata: Record<string, unknown>;
  };
};

export function findExistingConnectMembership(
  memberships: ConnectMembershipCandidate[]
): ConnectMembershipCandidate | undefined {
  const explicitConnect = memberships.filter(
    (membership) =>
      tryReadOrganizationProductType(membership.organization.publicMetadata) === OrganizationProductTypeEnum.CONNECT
  );

  if (explicitConnect.length > 0) {
    return explicitConnect[0];
  }

  const guard = readConnectAutoCreateSessionGuard();

  if (!guard) {
    return undefined;
  }

  return memberships.find((membership) => {
    if (membership.organization.id !== guard.organizationId) {
      return false;
    }

    const productType = tryReadOrganizationProductType(membership.organization.publicMetadata);

    return productType !== OrganizationProductTypeEnum.PLATFORM;
  });
}

export function hasExplicitConnectMembership(memberships: ConnectMembershipCandidate[]): boolean {
  return memberships.some(
    (membership) =>
      tryReadOrganizationProductType(membership.organization.publicMetadata) === OrganizationProductTypeEnum.CONNECT
  );
}

function parseConnectAutoCreateSessionGuard(raw: string | null): ConnectAutoCreateGuard | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ConnectAutoCreateGuard;

    if (typeof parsed.userId === 'string' && typeof parsed.organizationId === 'string') {
      return parsed;
    }
  } catch {
    // ignore legacy string guard
  }

  return null;
}

export function readConnectAutoCreateSessionGuard(): ConnectAutoCreateGuard | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseConnectAutoCreateSessionGuard(window.sessionStorage.getItem(AUTO_CREATE_SESSION_GUARD_KEY));
  } catch {
    return null;
  }
}

export function writeConnectAutoCreateSessionGuard(userId: string, organizationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ConnectAutoCreateGuard = { userId, organizationId };
    window.sessionStorage.setItem(AUTO_CREATE_SESSION_GUARD_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable
  }
}

export function clearConnectAutoCreateSessionGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTO_CREATE_SESSION_GUARD_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

// True for explicit Connect orgs, plus the just-created org id that hasn't synced metadata yet.
export function isActiveConnectWorkspace(
  publicMetadata: Record<string, unknown> | undefined,
  options?: { userId?: string; organizationId?: string }
): boolean {
  const productType = tryReadOrganizationProductType(publicMetadata);

  if (productType === OrganizationProductTypeEnum.CONNECT) {
    return true;
  }

  if (productType === OrganizationProductTypeEnum.PLATFORM) {
    return false;
  }

  const guard = readConnectAutoCreateSessionGuard();

  if (
    options?.userId &&
    options?.organizationId &&
    guard?.userId === options.userId &&
    guard.organizationId === options.organizationId
  ) {
    return true;
  }

  return false;
}

export function isConnectWorkspace(publicMetadata: Record<string, unknown> | undefined): boolean {
  return tryReadOrganizationProductType(publicMetadata) === OrganizationProductTypeEnum.CONNECT;
}
