import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AnalyticsService,
  buildSubscriberKey,
  buildUserKey,
  CachedResponse,
  IAuthService,
  Instrument,
} from '@novu/application-generic';

import {
  EnvironmentEntity,
  EnvironmentRepository,
  MemberEntity,
  MemberRepository,
  OrganizationRepository,
  SubscriberEntity,
  SubscriberRepository,
  UserEntity,
  UserRepository,
} from '@novu/dal';
import {
  ALL_PERMISSIONS,
  ApiAuthSchemeEnum,
  AuthenticateContext,
  AuthProviderEnum,
  ISubscriberJwt,
  MemberRoleEnum,
  normalizeEmail,
  UserSessionData,
} from '@novu/shared';
import { createHash } from 'crypto';
import { CreateUserCommand } from '../../user/usecases/create-user/create-user.command';
import { CreateUser } from '../../user/usecases/create-user/create-user.usecase';
import { SwitchOrganizationCommand } from '../usecases/switch-organization/switch-organization.command';
import { SwitchOrganization } from '../usecases/switch-organization/switch-organization.usecase';

@Injectable()
export class CommunityAuthService implements IAuthService {
  constructor(
    private userRepository: UserRepository,
    private subscriberRepository: SubscriberRepository,
    private createUserUsecase: CreateUser,
    private jwtService: JwtService,
    private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository,
    private environmentRepository: EnvironmentRepository,
    private memberRepository: MemberRepository,
    @Inject(forwardRef(() => SwitchOrganization))
    private switchOrganizationUsecase: SwitchOrganization
  ) {}

  public async authenticate(
    authProvider: AuthProviderEnum,
    accessToken: string,
    refreshToken: string,
    profile: {
      name: string;
      login: string;
      email: string;
      avatar_url: string;
      id: string;
    },
    distinctId: string,
    { origin, invitationToken }: AuthenticateContext = {}
  ) {
    const email = normalizeEmail(profile.email);
    let user = await this.userRepository.findByEmail(email);
    let newUser = false;

    if (!user) {
      const firstName = profile.name ? profile.name.split(' ').slice(0, -1).join(' ') : profile.login;
      const lastName = profile.name ? profile.name.split(' ').slice(-1).join(' ') : null;

      user = await this.createUserUsecase.execute(
        CreateUserCommand.create({
          picture: profile.avatar_url,
          email,
          firstName,
          lastName,
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
        origin,
        wasInvited: Boolean(invitationToken),
      });
    } else {
      if (authProvider === AuthProviderEnum.GITHUB) {
        user = await this.updateUserUsername(user, profile, authProvider);
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

  private async updateUserUsername(
    user: UserEntity,
    profile: {
      name: string;
      login: string;
      email: string;
      avatar_url: string;
      id: string;
    },
    authProvider: AuthProviderEnum
  ) {
    const withoutUsername = user.tokens.find(
      (token) => token.provider === authProvider && !token.username && String(token.providerId) === String(profile.id)
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

      const dbUser = await this.userRepository.findById(user._id);
      if (!dbUser) throw new BadRequestException('User not found');
      user = dbUser;
    }

    return user;
  }

  public async refreshToken(userId: string) {
    const user = await this.getUser({ _id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    return this.getSignedToken(user);
  }

  @Instrument()
  public async isAuthenticatedForOrganization(userId: string, organizationId: string): Promise<boolean> {
    return !!(await this.memberRepository.isMemberOfOrganization(organizationId, userId));
  }

  @Instrument()
  public async getUserByApiKey(apiKey: string): Promise<UserSessionData> {
    const { environment, user, error } = await this.getApiKeyUser({
      apiKey,
    });

    if (error) throw new UnauthorizedException(error);

    if (!user) throw new UnauthorizedException('User not found');

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      email: user.email,
      profilePicture: user.profilePicture || undefined,
      roles: [MemberRoleEnum.OSS_ADMIN],
      permissions: ALL_PERMISSIONS,
      organizationId: environment?._organizationId || '',
      environmentId: environment?._id || '',
      scheme: ApiAuthSchemeEnum.API_KEY,
    };
  }

  public async getSubscriberWidgetToken(subscriber: SubscriberEntity): Promise<string> {
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
        expiresIn: process.env.SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME || '15 days',
        issuer: 'novu_api',
        audience: 'widget_user',
      }
    );
  }

  public async generateUserToken(user: UserEntity) {
    const userActiveOrganizations = await this.organizationRepository.findUserActiveOrganizations(user._id);

    if (userActiveOrganizations?.length > 0) {
      const organizationToSwitch = userActiveOrganizations[0];

      return this.switchOrganizationUsecase.execute(
        SwitchOrganizationCommand.create({
          newOrganizationId: organizationToSwitch._id,
          userId: user._id,
        })
      );
    }

    return this.getSignedToken(user);
  }

  public async getSignedToken(
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
        /*
         * TODO: Remove it after deploying the new env switching logic twice to cater for outdated,
         * cached versions of Dashboard web app in Netlify.
         */
        environmentId: environmentId || null,
        roles,
      },
      {
        expiresIn: '30 days',
        issuer: 'novu_api',
      }
    );
  }

  @Instrument()
  public async validateUser(payload: UserSessionData): Promise<UserEntity> {
    const userPromise = this.getUser({ _id: payload._id });

    const isMemberPromise = payload.organizationId
      ? this.isAuthenticatedForOrganization(payload._id, payload.organizationId)
      : Promise.resolve(true);

    const [user, isMember] = await Promise.all([userPromise, isMemberPromise]);

    if (!user) throw new UnauthorizedException('User not found');
    if (payload.organizationId && !isMember) {
      throw new UnauthorizedException(`User ${payload._id} is not a member of organization ${payload.organizationId}`);
    }

    return user;
  }

  public async validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity | null> {
    return await this.getSubscriber({
      _environmentId: payload.environmentId,
      subscriberId: payload.subscriberId,
    });
  }

  public async isRootEnvironment(payload: UserSessionData): Promise<boolean> {
    const environment = await this.environmentRepository.findOne({
      _id: payload.environmentId,
    });
    if (!environment) throw new NotFoundException('Environment not found');

    return !!environment._parentId;
  }

  @Instrument()
  @CachedResponse({
    builder: (command: { _id: string }) =>
      buildUserKey({
        _id: command._id,
      }),
  })
  private async getUser({ _id }: { _id: string }) {
    return await this.userRepository.findById(_id);
  }

  @CachedResponse({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }

  private async getApiKeyUser({ apiKey }: { apiKey: string }): Promise<{
    environment?: EnvironmentEntity;
    user?: UserEntity;
    error?: string;
  }> {
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

    const environment = await this.environmentRepository.findByApiKey({
      hash: hashedApiKey,
    });

    if (!environment) {
      // Failed to find the environment for the provided API key.
      return { error: 'API Key not found' };
    }

    const key = environment.apiKeys.find((i) => i.hash === hashedApiKey);

    if (!key) {
      return { error: 'API Key not found' };
    }

    const user = await this.userRepository.findById(key._userId);
    if (!user) {
      return { error: 'User not found' };
    }

    return { environment, user };
  }
}
