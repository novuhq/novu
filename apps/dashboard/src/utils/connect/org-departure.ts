import { isConnectProvisioningActive } from './onboarding-session';
import { type ConnectMembershipCandidate, findExistingConnectMembership } from './workspace';

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
