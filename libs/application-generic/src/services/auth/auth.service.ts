import { Inject, Injectable } from '@nestjs/common';
import { MemberEntity, SubscriberEntity, UserEntity } from '@novu/dal';
import {
  AuthProviderEnum,
  AuthenticateContext,
  ISubscriberJwt,
  UserSessionData,
} from '@novu/shared';
import { IAuthService } from './auth.service.interface';

@Injectable()
export class AuthService implements IAuthService {
  constructor(@Inject('AUTH_SERVICE') private authService: IAuthService) {}

  authenticate(
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
    authContext: AuthenticateContext = {},
  ): Promise<{ newUser: boolean; token: string }> {
    return this.authService.authenticate(
      authProvider,
      accessToken,
      refreshToken,
      profile,
      distinctId,
      authContext,
    );
  }

  refreshToken(userId: string): Promise<string> {
    return this.authService.refreshToken(userId);
  }

  isAuthenticatedForOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    return this.authService.isAuthenticatedForOrganization(
      userId,
      organizationId,
    );
  }

  getUserByApiKey(apiKey: string): Promise<UserSessionData> {
    return this.authService.getUserByApiKey(apiKey);
  }

  getSubscriberWidgetToken(subscriber: SubscriberEntity): Promise<string> {
    return this.authService.getSubscriberWidgetToken(subscriber);
  }

  generateUserToken(user: UserEntity): Promise<string> {
    return this.authService.generateUserToken(user);
  }

  getSignedToken(
    user: UserEntity,
    organizationId?: string,
    member?: MemberEntity,
    environmentId?: string,
  ): Promise<string> {
    return this.authService.getSignedToken(
      user,
      organizationId,
      member,
      environmentId,
    );
  }

  validateUser(payload: UserSessionData): Promise<UserEntity> {
    return this.authService.validateUser(payload);
  }

  validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity> {
    return this.authService.validateSubscriber(payload);
  }

  isRootEnvironment(payload: UserSessionData): Promise<boolean> {
    return this.authService.isRootEnvironment(payload);
  }
}
