import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  UserEntity,
  UserRepository,
  MemberEntity,
  OrganizationRepository,
  ApplicationRepository,
  SubscriberEntity,
  SubscriberRepository,
  MemberRepository,
} from '@novu/dal';
import { AuthProviderEnum, IJwtPayload, ISubscriberJwt, MemberRoleEnum } from '@novu/shared';

import { CreateUserCommand } from '../../user/usecases/create-user/create-user.dto';
import { CreateUser } from '../../user/usecases/create-user/create-user.usecase';
import { SwitchApplicationCommand } from '../usecases/switch-application/switch-application.command';
import { SwitchApplication } from '../usecases/switch-application/switch-application.usecase';
import { SwitchOrganization } from '../usecases/switch-organization/switch-organization.usecase';
import { SwitchOrganizationCommand } from '../usecases/switch-organization/switch-organization.command';
import { QueueService } from '../../shared/services/queue';
import { AnalyticsService } from '../../shared/services/analytics/analytics.service';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private subscriberRepository: SubscriberRepository,
    private createUserUsecase: CreateUser,
    private jwtService: JwtService,
    private queueService: QueueService,
    private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository,
    private applicationRepository: ApplicationRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => SwitchOrganization)) private switchOrganizationUsecase: SwitchOrganization,
    @Inject(forwardRef(() => SwitchApplication)) private switchApplicationUsecase: SwitchApplication
  ) {}

  async authenticate(
    authProvider: AuthProviderEnum,
    accessToken: string,
    refreshToken: string,
    profile: { name: string; login: string; email: string; avatar_url: string; id: string },
    distinctId: string
  ) {
    let user = await this.userRepository.findByLoginProvider(profile.id, authProvider);
    let newUser = false;

    if (!user) {
      user = await this.createUserUsecase.execute(
        CreateUserCommand.create({
          picture: profile.avatar_url,
          email: profile.email,
          lastName: profile.name ? profile.name.split(' ').slice(-1).join(' ') : null,
          firstName: profile.name ? profile.name.split(' ').slice(0, -1).join(' ') : profile.login,
          auth: {
            profileId: profile.id,
            provider: authProvider,
            accessToken,
            refreshToken,
          },
        })
      );
      newUser = true;

      this.analyticsService.upsertUser(user, distinctId || user._id);

      if (distinctId) {
        this.analyticsService.alias(distinctId, user._id);
      }
    } else {
      this.analyticsService.track('[Authentication] - Login', user._id, {
        loginType: authProvider,
      });
    }

    return {
      newUser,
      token: await this.generateUserToken(user),
    };
  }

  async refreshToken(userId: string) {
    const user = await this.userRepository.findById(userId);

    return this.getSignedToken(user);
  }

  async isAuthenticatedForOrganization(userId: string, organizationId: string): Promise<boolean> {
    return !!(await this.memberRepository.isMemberOfOrganization(organizationId, userId));
  }

  async apiKeyAuthenticate(apiKey: string) {
    const application = await this.applicationRepository.findByApiKey(apiKey);
    if (!application) throw new UnauthorizedException('API Key not found');

    const key = application.apiKeys.find((i) => i.key === apiKey);
    const user = await this.userRepository.findById(key._userId);

    return await this.getApiSignedToken(user, application._organizationId, application._id, key.key);
  }

  async getSubscriberWidgetToken(subscriber: SubscriberEntity) {
    return this.jwtService.sign(
      {
        _id: subscriber._id,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        email: subscriber.email,
        organizationId: subscriber._organizationId,
        applicationId: subscriber._applicationId,
        subscriberId: subscriber.subscriberId,
      },
      {
        expiresIn: '15 day',
        issuer: 'novu_api',
        audience: 'widget_user',
      }
    );
  }

  async getApiSignedToken(
    user: UserEntity,
    organizationId: string,
    applicationId: string,
    apiKey: string
  ): Promise<string> {
    return this.jwtService.sign(
      {
        _id: user._id,
        firstName: null,
        lastName: null,
        email: null,
        profilePicture: null,
        organizationId,
        roles: [MemberRoleEnum.ADMIN],
        apiKey,
        applicationId,
      },
      {
        expiresIn: '1 day',
        issuer: 'novu_api',
        audience: 'api_token',
      }
    );
  }

  async generateUserToken(user: UserEntity) {
    const userActiveOrganizations = await this.organizationRepository.findUserActiveOrganizations(user._id);

    if (userActiveOrganizations && userActiveOrganizations.length) {
      const organizationToSwitch = userActiveOrganizations[0];

      const userActiveProjects = await this.applicationRepository.findOrganizationApplications(
        organizationToSwitch._id
      );
      const applicationToSwitch = userActiveProjects[0];

      if (applicationToSwitch) {
        return await this.switchApplicationUsecase.execute(
          SwitchApplicationCommand.create({
            newApplicationId: applicationToSwitch._id,
            organizationId: organizationToSwitch._id,
            userId: user._id,
          })
        );
      }

      return await this.switchOrganizationUsecase.execute(
        SwitchOrganizationCommand.create({
          newOrganizationId: organizationToSwitch._id,
          userId: user._id,
        })
      );
    }

    return this.getSignedToken(user);
  }

  async getSignedToken(
    user: UserEntity,
    organizationId?: string,
    member?: MemberEntity,
    applicationId?: string
  ): Promise<string> {
    const roles = [];
    if (member && member.roles) {
      roles.push(...member.roles);
    }

    return this.jwtService.sign(
      {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: user.profilePicture,
        organizationId: organizationId || null,
        roles,
        applicationId: applicationId || null,
      },
      {
        expiresIn: '30 days',
        issuer: 'novu_api',
      }
    );
  }

  async validateUser(payload: IJwtPayload): Promise<UserEntity> {
    const user = await this.userRepository.findById(payload._id);
    if (payload.organizationId) {
      const isMember = await this.isAuthenticatedForOrganization(payload._id, payload.organizationId);
      if (!isMember) throw new UnauthorizedException(`No authorized for organization ${payload.organizationId}`);
    }

    return user;
  }

  async validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity> {
    const subscriber = await this.subscriberRepository.findOne({
      _applicationId: payload.applicationId,
      _id: payload._id,
    });

    return subscriber;
  }

  async decodeJwt<T>(token: string) {
    return this.jwtService.decode(token) as T;
  }

  async verifyJwt(jwt: string) {
    return this.jwtService.verify(jwt);
  }
}
