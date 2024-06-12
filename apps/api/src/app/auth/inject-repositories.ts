import { CommunityUserRepository, CommunityMemberRepository, CommunityOrganizationRepository } from '@novu/dal';
import { PlatformException } from '@novu/application-generic';

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

    return [userRepositoryProvider, memberRepositoryProvider, organizationRepositoryProvider];
  }

  const eeUserRepositoryProvider = {
    provide: 'USER_REPOSITORY',
    useFactory: (userRepository: CommunityUserRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEUserRepository) {
        throw new PlatformException('EEUserRepository is not loaded');
      }

      return new eeAuthPackage.EEUserRepository(userRepository);
    },
    inject: [CommunityUserRepository],
  };

  const eeMemberRepositoryProvider = {
    provide: 'MEMBER_REPOSITORY',
    useFactory: (organizationRepository: CommunityOrganizationRepository, userRepository: CommunityUserRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEMemberRepository) {
        throw new PlatformException('EEMemberRepository is not loaded');
      }

      return new eeAuthPackage.EEMemberRepository(organizationRepository, userRepository);
    },
    inject: [CommunityOrganizationRepository, CommunityUserRepository],
  };

  const eeOrganizationRepositoryProvider = {
    provide: 'ORGANIZATION_REPOSITORY',
    useFactory: (organizationRepository: CommunityOrganizationRepository) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEOrganizationRepository) {
        throw new PlatformException('EEOrganizationRepository is not loaded');
      }

      return new eeAuthPackage.EEOrganizationRepository(organizationRepository);
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
