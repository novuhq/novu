import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  CommunityUserRepository,
  CommunityMemberRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  SubscriberRepository,
  UserRepository,
  MemberRepository,
  OrganizationRepository,
} from '@novu/dal';
import { IS_CLERK_ENABLED } from '@novu/shared';
import {
  AnalyticsService,
  CommunityAuthService,
  CommunityUserAuthGuard,
} from '../services';
import { CreateUser, SwitchOrganization, SwitchEnvironment } from '../usecases';

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
  if (!IS_CLERK_ENABLED) {
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

    const authServiceProvider = {
      provide: 'AUTH_SERVICE',
      useFactory: (
        userRepository: UserRepository,
        subscriberRepository: SubscriberRepository,
        createUserUsecase: CreateUser,
        jwtService: JwtService,
        analyticsService: AnalyticsService,
        organizationRepository: OrganizationRepository,
        environmentRepository: EnvironmentRepository,
        memberRepository: MemberRepository,
        switchOrganizationUsecase: SwitchOrganization,
        switchEnvironmentUsecase: SwitchEnvironment
      ) => {
        return new CommunityAuthService(
          userRepository,
          subscriberRepository,
          createUserUsecase,
          jwtService,
          analyticsService,
          organizationRepository,
          environmentRepository,
          memberRepository,
          switchOrganizationUsecase,
          switchEnvironmentUsecase
        );
      },
      inject: [
        UserRepository,
        SubscriberRepository,
        CreateUser,
        JwtService,
        AnalyticsService,
        OrganizationRepository,
        EnvironmentRepository,
        MemberRepository,
        SwitchOrganization,
        SwitchEnvironment,
      ],
    };

    const userAuthGuardProvider = {
      provide: 'USER_AUTH_GUARD',
      useFactory: (reflector: Reflector) => {
        return new CommunityUserAuthGuard(reflector);
      },
      inject: [Reflector],
    };

    if (repositoriesOnly) {
      return [
        userRepositoryProvider,
        memberRepositoryProvider,
        organizationRepositoryProvider,
      ];
    }

    return [
      userRepositoryProvider,
      memberRepositoryProvider,
      organizationRepositoryProvider,
      authServiceProvider,
      userAuthGuardProvider,
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
