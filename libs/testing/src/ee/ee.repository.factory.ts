import { CommunityOrganizationRepository, CommunityUserRepository, CommunityMemberRepository } from '@novu/dal';
import { isClerkEnabled } from '@novu/shared';

/**
 * We are using nx-ignore-next-line as a workaround here to avoid following circular dependency error:
 * @novu/application-generic:build --> @novu/testing:build --> @novu/ee-auth:build --> @novu/application-generic:build
 *
 * When revising EE testing, we should consider refactoring the code to potentially avoid this circular dependency.
 *
 */
export function getEERepository<T>(className: 'OrganizationRepository' | 'MemberRepository' | 'UserRepository'): T {
  if (isClerkEnabled()) {
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
  // nx-ignore-next-line
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseUserRepository = enterpriseModule?.EEUserRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseUserRepository(new CommunityUserRepository(), new clerkClientMock());
}

function getEEOrganizationRepository() {
  // nx-ignore-next-line
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseOrganizationRepository = enterpriseModule?.EEOrganizationRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseOrganizationRepository(new CommunityOrganizationRepository(), new clerkClientMock());
}

function getEEMemberRepository() {
  // nx-ignore-next-line
  const enterpriseModule = require('@novu/ee-auth');
  const enterpriseMemberRepository = enterpriseModule?.EEMemberRepository;
  const clerkClientMock = enterpriseModule?.ClerkClientMock;

  return new enterpriseMemberRepository(new CommunityOrganizationRepository(), new clerkClientMock());
}
