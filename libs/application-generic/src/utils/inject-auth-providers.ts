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
import { PinoLogger } from '../logging';
import {
  AnalyticsService,
  CommunityAuthService,
  CommunityUserAuthGuard,
} from '../services';
import { CreateUser, SwitchOrganization } from '../usecases';

/**
 * Injects community auth providers, or providers handling user management (services, repositories, guards ...) into the application.
 * This function is closely related to its enterprise counterpart:
 *
 *  @see @novu/ee-auth -> injectEEAuthProviders()
 *
 */
export function injectCommunityAuthProviders(
  { repositoriesOnly }: { repositoriesOnly?: boolean } = {
    repositoriesOnly: true,
  },
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
    ],
  };

  const userAuthGuardProvider = {
    provide: 'USER_AUTH_GUARD',
    useFactory: (reflector: Reflector, logger: PinoLogger) => {
      return new CommunityUserAuthGuard(reflector, logger);
    },
    inject: [Reflector, PinoLogger],
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
