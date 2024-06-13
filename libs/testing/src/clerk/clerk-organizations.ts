import { Organization } from '@novu/shared';

const CLERK_ORGANIZATION_1: Organization = {
  id: 'clerk_org_1',
  name: 'Organization 1',
  slug: 'organization-1',
  imageUrl: 'https://example.com/organization-1.png',
  hasImage: true,
  createdBy: 'user_1',
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
  publicMetadata: {},
  privateMetadata: {},
  maxAllowedMemberships: 10,
  adminDeleteEnabled: true,
  membersCount: 10,
};

export const CLERK_ORGANIZATIONS = new Map<string, Organization>([[CLERK_ORGANIZATION_1.id, CLERK_ORGANIZATION_1]]);
