import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  CommunityUserRepository,
  CommunityMemberRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  SubscriberRepository,
  UserRepository,
} from '@novu/dal';

class PlatformException extends Error {}

function injectClerkClientMock() {
  if (process.env.NODE_ENV === 'test') {
    const clerkClientMock = require('@novu/ee-auth').ClerkClientMock;

    return new clerkClientMock();
  }
}

export function injectRepositories(
  { repositoriesOnly }: { repositoriesOnly?: boolean } = {
    repositoriesOnly: true,
  }
) {
  if (
    process.env.NOVU_ENTERPRISE !== 'true' &&
    process.env.CI_EE_TEST !== 'true'
  ) {
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

  const eeAuthServiceProvider = {
    provide: 'AUTH_SERVICE',
    useFactory: (
      userRepository: UserRepository,
      environmentRepository: EnvironmentRepository,
      subscriberRepository: SubscriberRepository,
      jwtService: JwtService
    ) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEAuthService) {
        throw new PlatformException('EEAuthService is not loaded');
      }

      return new eeAuthPackage.EEAuthService(
        userRepository,
        environmentRepository,
        subscriberRepository,
        jwtService
      );
    },
    inject: [
      UserRepository,
      EnvironmentRepository,
      SubscriberRepository,
      JwtService,
    ],
  };

  const eeUserAuthGuard = {
    provide: 'USER_AUTH_GUARD',
    useFactory: (reflector: Reflector) => {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEUserAuthGuard) {
        throw new PlatformException('EEUserAuthGuard is not loaded');
      }

      return new eeAuthPackage.EEUserAuthGuard(reflector);
    },
    inject: [Reflector],
  };

  if (repositoriesOnly) {
    return [
      eeUserRepositoryProvider,
      CommunityUserRepository,
      eeMemberRepositoryProvider,
      CommunityMemberRepository,
      eeOrganizationRepositoryProvider,
      CommunityOrganizationRepository,
    ];
  }

  return [
    eeUserRepositoryProvider,
    CommunityUserRepository,
    eeMemberRepositoryProvider,
    CommunityMemberRepository,
    eeOrganizationRepositoryProvider,
    CommunityOrganizationRepository,
    eeAuthServiceProvider,
    eeUserAuthGuard,
  ];
}
