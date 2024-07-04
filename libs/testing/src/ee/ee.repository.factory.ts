import { CommunityOrganizationRepository, CommunityUserRepository, CommunityMemberRepository } from '@novu/dal';
import { IS_CLERK_ENABLED } from '@novu/shared';

export function getEERepository<T>(className: 'OrganizationRepository' | 'MemberRepository' | 'UserRepository'): T {
  if (IS_CLERK_ENABLED) {
    switch (className) {
      case 'OrganizationRepository':
        return getEEOrganizationRepository();
      case 'MemberRepository':
        return getEEMemberRepository();
      case 'UserRepository':
        return getEEUserRepository();
    }
  }

  switch (className) {
    case 'OrganizationRepository':
      return new CommunityOrganizationRepository() as T;
    case 'MemberRepository':
      return new CommunityMemberRepository() as T;
    case 'UserRepository':
      return new CommunityUserRepository() as T;
  }
}

function getEEUserRepository() {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseUserRepository = enterpriseModule?.EEUserRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseUserRepository(new CommunityUserRepository(), new clerkClientMock());
}

function getEEOrganizationRepository() {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseOrganizationRepository = enterpriseModule?.EEOrganizationRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseOrganizationRepository(new CommunityOrganizationRepository(), new clerkClientMock());
}

function getEEMemberRepository() {
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseMemberRepository = enterpriseModule?.EEMemberRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseMemberRepository(new CommunityOrganizationRepository(), new clerkClientMock());
}
