import {
  CommunityUserRepository,
  CommunityMemberRepository,
  CommunityOrganizationRepository,
} from '@novu/dal';

class PlatformException extends Error {}

function injectClerkClientMock() {
  if (process.env.NODE_ENV === 'test') {
    const clerkClientMock = require('@novu/ee-auth').ClerkClientMock;

    return new clerkClientMock();
  }
}

export function injectRepositories() {
  if (process.env.NOVU_ENTERPRISE !== 'true') {
    const userRepositoryProvider = {
      provide: 'USER_REPOSITORY',
      useClass: CommunityUserRepository,
    };

    const memberRepositoryProvider = {
      provide: 'MEMBER_REPOSITORY',
      useClass: CommunityMemberRepository,
    };

    const organizationRepositoryProvider = {
      provide: 'ORGANIZATION_REPOSITORY',
      useClass: CommunityOrganizationRepository,
    };

    return [
      userRepositoryProvider,
      memberRepositoryProvider,
      organizationRepositoryProvider,
    ];
  }

  const eeUserRepositoryProvider = {
    provide: 'USER_REPOSITORY',
    useFactory: (userRepository: CommunityUserRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEUserRepository) {
        throw new PlatformException('EEUserRepository is not loaded');
      }

      return new eeAuthPackage.EEUserRepository(
        userRepository,
        injectClerkClientMock()
      );
    },
    inject: [CommunityUserRepository],
  };

  const eeMemberRepositoryProvider = {
    provide: 'MEMBER_REPOSITORY',
    useFactory: (organizationRepository: CommunityOrganizationRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEMemberRepository) {
        throw new PlatformException('EEMemberRepository is not loaded');
      }

      return new eeAuthPackage.EEMemberRepository(
        organizationRepository,
        injectClerkClientMock()
      );
    },
    inject: [CommunityOrganizationRepository],
  };

  const eeOrganizationRepositoryProvider = {
    provide: 'ORGANIZATION_REPOSITORY',
    useFactory: (organizationRepository: CommunityOrganizationRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEOrganizationRepository) {
        throw new PlatformException('EEOrganizationRepository is not loaded');
      }

      return new eeAuthPackage.EEOrganizationRepository(
        organizationRepository,
        injectClerkClientMock()
      );
    },
    inject: [CommunityOrganizationRepository],
  };

  return [
    eeUserRepositoryProvider,
    CommunityUserRepository,
    eeMemberRepositoryProvider,
    CommunityMemberRepository,
    eeOrganizationRepositoryProvider,
    CommunityOrganizationRepository,
  ];
}
