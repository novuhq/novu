import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { Organization, OrganizationMembership, User } from '@novu/shared';
import { clerkMockDatabase } from './clerk/clerk.database';

type ClerkDatabase = {
  clerkUsers: Map<string, User>;
  clerkOrganizations: Map<string, Organization>;
  clerkOrganizationMemberships: Map<string, OrganizationMembership[]>;
};

export function getRepository<T>(
  className: 'OrganizationRepository' | 'MemberRepository' | 'UserRepository',
  clerkDatabase: {
    clerkUsers: Map<string, User>;
    clerkOrganizations: Map<string, Organization>;
    clerkOrganizationMemberships: Map<string, OrganizationMembership[]>;
  } = clerkMockDatabase
): T {
  const isEE = process.env.NOVU_ENTERPRISE === 'true';

  switch (className) {
    case 'OrganizationRepository':
      return isEE ? getEEOrganizationRepository(clerkDatabase) : new CommunityOrganizationRepository();
    case 'MemberRepository':
      return isEE ? getEEMemberRepository(clerkDatabase) : new CommunityOrganizationRepository();
    case 'UserRepository':
      return isEE ? getEEUserRepository(clerkDatabase) : new CommunityUserRepository();
  }
}

function getEEUserRepository(clerkDatabase: ClerkDatabase) {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseUserRepository = enterpriseModule?.EEUserRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseUserRepository(
    new CommunityUserRepository(),
    new clerkClientMock(
      clerkDatabase.clerkUsers,
      clerkDatabase.clerkOrganizations,
      clerkDatabase.clerkOrganizationMemberships
    )
  );
}

function getEEOrganizationRepository(clerkDatabase: ClerkDatabase) {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseOrganizationRepository = enterpriseModule?.EEOrganizationRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseOrganizationRepository(
    new CommunityOrganizationRepository(),
    new clerkClientMock(
      clerkDatabase.clerkUsers,
      clerkDatabase.clerkOrganizations,
      clerkDatabase.clerkOrganizationMemberships
    )
  );
}

function getEEMemberRepository(clerkDatabase: ClerkDatabase) {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseMemberRepository = enterpriseModule?.EEMemberRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseMemberRepository(
    new CommunityOrganizationRepository(),
    new CommunityUserRepository(),
    new clerkClientMock(
      clerkDatabase.clerkUsers,
      clerkDatabase.clerkOrganizations,
      clerkDatabase.clerkOrganizationMemberships
    )
  );
}
