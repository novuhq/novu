import { forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  EnvironmentRepository,
  MemberEntity,
  MemberRepository,
  OrganizationRepository,
  SubscriberEntity,
  SubscriberRepository,
  UserEntity,
  UserRepository,
  EnvironmentEntity,
  IApiKey,
} from '@novu/dal';
import { AuthProviderEnum, IJwtPayload, ISubscriberJwt, MemberRoleEnum, SignUpOriginEnum } from '@novu/shared';
import {
  AnalyticsService,
  Instrument,
  PinoLogger,
  CachedEntity,
  buildEnvironmentByApiKey,
  buildSubscriberKey,
  buildUserKey,
  buildAuthServiceKey,
} from '@novu/application-generic';

import { CreateUserCommand } from '../../user/usecases/create-user/create-user.dto';
import { CreateUser } from '../../user/usecases/create-user/create-user.usecase';
import { SwitchEnvironmentCommand } from '../usecases/switch-environment/switch-environment.command';
import { SwitchEnvironment } from '../usecases/switch-environment/switch-environment.usecase';
import { SwitchOrganization } from '../usecases/switch-organization/switch-organization.usecase';
import { SwitchOrganizationCommand } from '../usecases/switch-organization/switch-organization.command';
import { normalizeEmail } from '../../shared/helpers/email-normalization.service';
import { ApiException } from '../../shared/exceptions/api.exception';

@Injectable()
export class AuthService {
  constructor(
    private logger: PinoLogger,
    private userRepository: UserRepository,
    private subscriberRepository: SubscriberRepository,
    private createUserUsecase: CreateUser,
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => SwitchOrganization)) private switchOrganizationUsecase: SwitchOrganization,
    @Inject(forwardRef(() => SwitchEnvironment)) private switchEnvironmentUsecase: SwitchEnvironment
  ) {}

  async authenticate(
    authProvider: AuthProviderEnum,
    accessToken: string,
    refreshToken: string,
    profile: { name: string; login: string; email: string; avatar_url: string; id: string },
    distinctId: string,
    origin?: SignUpOriginEnum
  ) {
    const email = normalizeEmail(profile.email);
    let user = await this.userRepository.findByEmail(email);
    let newUser = false;

    if (!user) {
      user = await this.createUserUsecase.execute(
        CreateUserCommand.create({
          picture: profile.avatar_url,
          email,
          lastName: profile.name ? profile.name.split(' ').slice(-1).join(' ') : null,
          firstName: profile.name ? profile.name.split(' ').slice(0, -1).join(' ') : profile.login,
          auth: {
            username: profile.login,
            profileId: profile.id,
            provider: authProvider,
            accessToken,
            refreshToken,
          },
        })
      );
      newUser = true;

      if (distinctId) {
        this.analyticsService.alias(distinctId, user._id);
      }

      this.analyticsService.track('[Authentication] - Signup', user._id, {
        loginType: authProvider,
        origin: origin,
      });
    } else {
      if (authProvider === AuthProviderEnum.GITHUB) {
        const withoutUsername = user.tokens.find(
          (i) => i.provider === AuthProviderEnum.GITHUB && !i.username && String(i.providerId) === String(profile.id)
        );

        if (withoutUsername) {
          await this.userRepository.update(
            {
              _id: user._id,
              'tokens.providerId': profile.id,
            },
            {
              $set: {
                'tokens.$.username': profile.login,
              },
            }
          );

          user = await this.userRepository.findById(user._id);
          if (!user) throw new ApiException('User not found');
        }
      }

      this.analyticsService.track('[Authentication] - Login', user._id, {
        loginType: authProvider,
      });
    }

    this.analyticsService.upsertUser(user, user._id);

    return {
      newUser,
      token: await this.generateUserToken(user),
    };
  }

  async refreshToken(userId: string) {
    const user = await this.getUser({ _id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    return this.getSignedToken(user);
  }

  @Instrument()
  async isAuthenticatedForOrganization(userId: string, organizationId: string): Promise<boolean> {
    return !!(await this.memberRepository.isMemberOfOrganization(organizationId, userId));
  }

  @Instrument()
  async apiKeyAuthenticate(apiKey: string) {
    const { environment, user, key, error } = await this.getUserData({ apiKey });

    if (error) throw new UnauthorizedException(error);
    if (!environment) throw new UnauthorizedException('API Key not found');
    if (!user) throw new UnauthorizedException('User not found');

    this.logger.assign({
      userId: user._id,
      environmentId: environment._id,
      organizationId: environment._organizationId,
    });

    if (!key) throw new UnauthorizedException('API Key not found');

    return await this.getApiSignedToken(user, environment._organizationId, environment._id, key.key);
  }

  async getSubscriberWidgetToken(subscriber: SubscriberEntity): Promise<string> {
    return this.jwtService.sign(
      {
        _id: subscriber._id,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        email: subscriber.email,
        organizationId: subscriber._organizationId,
        environmentId: subscriber._environmentId,
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
    environmentId: string,
    apiKey: string
  ): Promise<string> {
    return this.jwtService.sign(
      {
        _id: user._id,
        firstName: 'API Request',
        lastName: null,
        email: user.email,
        profilePicture: null,
        organizationId,
        roles: [MemberRoleEnum.ADMIN],
        apiKey,
        environmentId,
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

      const userActiveProjects = await this.environmentRepository.findOrganizationEnvironments(
        organizationToSwitch._id
      );
      let environmentToSwitch = userActiveProjects[0];

      const reduceEnvsToOnlyDevelopment = (prev, current) => (current.name === 'Development' ? current : prev);

      if (userActiveProjects.length > 1) {
        environmentToSwitch = userActiveProjects.reduce(reduceEnvsToOnlyDevelopment, environmentToSwitch);
      }

      if (environmentToSwitch) {
        return await this.switchEnvironmentUsecase.execute(
          SwitchEnvironmentCommand.create({
            newEnvironmentId: environmentToSwitch._id,
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
    environmentId?: string
  ): Promise<string> {
    const roles: MemberRoleEnum[] = [];
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
        environmentId: environmentId || null,
      },
      {
        expiresIn: '30 days',
        issuer: 'novu_api',
      }
    );
  }

  @Instrument()
  async validateUser(payload: IJwtPayload): Promise<UserEntity> {
    // We run these in parallel to speed up the query time
    const userPromise = this.getUser({ _id: payload._id });
    const isMemberPromise = payload.organizationId
      ? this.isAuthenticatedForOrganization(payload._id, payload.organizationId)
      : Promise.resolve(true);
    const [user, isMember] = await Promise.all([userPromise, isMemberPromise]);

    if (!user) throw new UnauthorizedException('User not found');
    if (payload.organizationId && !isMember) {
      throw new UnauthorizedException(`No authorized for organization ${payload.organizationId}`);
    }

    return user;
  }

  async validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity | null> {
    return await this.getSubscriber({ _environmentId: payload.environmentId, subscriberId: payload.subscriberId });
  }

  async decodeJwt<T>(token: string) {
    return this.jwtService.decode(token) as T;
  }

  async verifyJwt(jwt: string) {
    return this.jwtService.verify(jwt);
  }

  async isRootEnvironment(payload: IJwtPayload): Promise<boolean> {
    const environment = await this.environmentRepository.findOne({
      _id: payload.environmentId,
    });
    if (!environment) throw new NotFoundException('Environment not found');

    return !!environment._parentId;
  }

  @Instrument()
  @CachedEntity({
    builder: (command: { _id: string }) =>
      buildUserKey({
        _id: command._id,
      }),
  })
  private async getUser({ _id }: { _id: string }) {
    return await this.userRepository.findById(_id);
  }

  @Instrument()
  @CachedEntity({
    builder: ({ apiKey }: { apiKey: string }) =>
      buildEnvironmentByApiKey({
        apiKey: apiKey,
      }),
  })
  private async getEnvironment({ apiKey }: { apiKey: string }) {
    return await this.environmentRepository.findByApiKey(apiKey);
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriber({ subscriberId, _environmentId }: { subscriberId: string; _environmentId: string }) {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }

  @CachedEntity({
    builder: ({ apiKey }: { apiKey: string }) =>
      buildAuthServiceKey({
        apiKey: apiKey,
      }),
  })
  private async getUserData({
    apiKey,
  }: {
    apiKey: string;
  }): Promise<{ environment?: EnvironmentEntity; user?: UserEntity; key?: IApiKey; error?: string }> {
    const environment = await this.environmentRepository.findByApiKey(apiKey);
    if (!environment) {
      return { error: 'API Key not found' };
    }

    const key = environment.apiKeys.find((i) => i.key === apiKey);
    if (!key) {
      return { error: 'API Key not found' };
    }

    const user = await this.userRepository.findById(key._userId);
    if (!user) {
      return { error: 'User not found' };
    }

    return { environment, user, key };
  }
}
