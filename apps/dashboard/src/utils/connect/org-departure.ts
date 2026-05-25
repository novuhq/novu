import { isConnectProvisioningActive } from './onboarding-session';
import { type ConnectMembershipCandidate, findExistingConnectMembership } from './workspace';

/**
 * Resolution outcomes for an arrival at the Connect org-list route. `switch` and `create` run
 * silently as side effects; `manualCreate` means the user has no Connect workspace and we
 * shouldn't auto-provision (e.g. they just left/deleted their last Connect org) — render the
 * same manual picker / create-form UI Platform uses instead of signing them out.
 */
export type ConnectOrgListAction =
  | { type: 'switch'; organizationId: string; organizationName: string }
  | { type: 'create' }
  | { type: 'manualCreate' };

export function resolveConnectOrgListAction(memberships: ConnectMembershipCandidate[]): ConnectOrgListAction {
  const existingConnect = findExistingConnectMembership(memberships);

  if (existingConnect) {
    return {
      type: 'switch',
      organizationId: existingConnect.organization.id,
      organizationName: existingConnect.organization.name,
    };
  }

  if (isConnectProvisioningActive()) {
    return { type: 'create' };
  }

  return { type: 'manualCreate' };
}
