/* eslint-disable global-require */
import { CommunityOrganizationRepository, CommunityUserRepository, CommunityMemberRepository } from '@novu/dal';
import { isClerkEnabled } from '@novu/shared';
import { ClerkClientMock } from './clerk-client.mock';

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
      default:
        throw new Error('Invalid repository name');
    }
  }

  switch (className) {
    case 'OrganizationRepository':
      return new CommunityOrganizationRepository() as T;
    case 'MemberRepository':
      return new CommunityMemberRepository() as T;
    case 'UserRepository':
      return new CommunityUserRepository() as T;
    default:
      throw new Error('Invalid repository name');
  }
}

const clerkClientMock = new ClerkClientMock();

function getEEUserRepository() {
  // nx-ignore-next-line
  const { EEUserRepository } = require('@novu/ee-auth');

  return new EEUserRepository(new CommunityUserRepository(), clerkClientMock);
}

function getEEOrganizationRepository() {
  // nx-ignore-next-line
  const { EEOrganizationRepository } = require('@novu/ee-auth');

  return new EEOrganizationRepository(new CommunityOrganizationRepository(), clerkClientMock);
}

function getEEMemberRepository() {
  // nx-ignore-next-line
  const { EEMemberRepository } = require('@novu/ee-auth');

  return new EEMemberRepository(new CommunityOrganizationRepository(), clerkClientMock);
}
