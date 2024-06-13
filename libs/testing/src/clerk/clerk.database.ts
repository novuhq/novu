import { Organization, OrganizationMembership, User } from '@novu/shared';
import { CLERK_ORGANIZATION_MEMBERSHIPS } from './clerk-organization-membership';
import { CLERK_ORGANIZATIONS } from './clerk-organizations';
import { CLERK_USERS } from './clerk-users';

export const clerkMockDatabase: {
  clerkUsers: Map<string, User>;
  clerkOrganizations: Map<string, Organization>;
  clerkOrganizationMemberships: Map<string, OrganizationMembership[]>;
} = {
  clerkUsers: CLERK_USERS,
  clerkOrganizations: CLERK_ORGANIZATIONS,
  clerkOrganizationMemberships: CLERK_ORGANIZATION_MEMBERSHIPS,
};
