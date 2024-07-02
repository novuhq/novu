import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';

export function getEERepository<T>(className: 'OrganizationRepository' | 'MemberRepository' | 'UserRepository'): T {
  switch (className) {
    case 'OrganizationRepository':
      return getEEOrganizationRepository();
    case 'MemberRepository':
      return getEEMemberRepository();
    case 'UserRepository':
      return getEEUserRepository();
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
