import { OrganizationMembership as ClerkOrganizationMemberships } from '@clerk/clerk-sdk-node';
import { OrganizationCustomRoleKey } from '@clerk/types';

export type OrganizationMembership = ClerkOrganizationMemberships;

export type CreateOrganizationMembershipParams = {
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
};

export type OrganizationMembershipRole = OrganizationCustomRoleKey;
