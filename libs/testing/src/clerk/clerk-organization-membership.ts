/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OrganizationMembership, OrganizationMembershipPublicUserData } from '@clerk/clerk-sdk-node';
import { User } from '@novu/shared';
import { CLERK_ORGANIZATIONS } from './clerk-organizations';
import { CLERK_USERS } from './clerk-users';

const getPublicUserDataFromUser = (user: User): OrganizationMembershipPublicUserData => ({
  identifier: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  imageUrl: user.imageUrl,
  hasImage: user.hasImage,
  userId: user.id,
});

const CLERK_ORGANIZATION_1_MEMBERSHIPS: OrganizationMembership[] = [
  {
    id: 'membership_1',
    role: 'admin',
    publicMetadata: {},
    privateMetadata: {},
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    organization: CLERK_ORGANIZATIONS.get('org_1')!,
    publicUserData: getPublicUserDataFromUser(CLERK_USERS.get('clerk_user_1')!),
  },
];

export const CLERK_ORGANIZATION_MEMBERSHIPS = new Map<string, OrganizationMembership[]>([
  [CLERK_ORGANIZATIONS.get('clerk_org_1')!.id, CLERK_ORGANIZATION_1_MEMBERSHIPS],
]);
