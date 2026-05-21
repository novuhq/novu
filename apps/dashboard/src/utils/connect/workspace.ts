import { OrganizationProductTypeEnum, tryReadOrganizationProductType } from '@novu/shared';

/**
 * Connect-vs-Platform predicates. Reach for the right one — they intentionally differ on how
 * they treat missing metadata and the freshly-created-but-not-yet-synced edge case.
 *
 * | Predicate                              | Returns true when                                                                | Use it for                                                          |
 * | -------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
 * | `tryReadOrganizationProductType`       | metadata has explicit `connect` or `platform` (else `undefined`)                 | distinguishing "missing" from "platform" (auth redirect logic)      |
 * | `resolveOrganizationProductType`       | always returns a value, defaulting to `platform` when missing                    | non-redirect persistence + display where defaulting is safe         |
 * | `isConnectWorkspace(meta)`             | metadata is explicitly `productType: connect`                                     | org-switcher filtering, "is this membership Connect" decisions       |
 * | `hasExplicitConnectMembership(list)`   | any membership has explicit `productType: connect`                                | "do we still need the first-visit switch confirmation?"             |
 * | `findExistingConnectMembership(list)`  | any explicit Connect membership, or one matching the auto-create session guard    | org-list resolution before/after the backend metadata write lands    |
 * | `isActiveConnectWorkspace(meta, opts)` | the active org is explicit Connect, or matches the auto-create session guard      | the Connect host's "is the current session Connect?" check          |
 */

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

/** Only explicit Connect workspaces — used for first-visit switch confirmation. */
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
    /* legacy string guard — ignore */
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
    /* sessionStorage unavailable — best-effort guard */
  }
}

export function clearConnectAutoCreateSessionGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTO_CREATE_SESSION_GUARD_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

/**
 * Whether the active Clerk org is a Connect workspace. Only explicit `productType: connect`
 * counts, except the org id we just created this session before backend metadata sync lands.
 */
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

/** Org switcher filter for the Connect host — only explicit Connect workspaces. */
export function isConnectWorkspace(publicMetadata: Record<string, unknown> | undefined): boolean {
  return tryReadOrganizationProductType(publicMetadata) === OrganizationProductTypeEnum.CONNECT;
}
