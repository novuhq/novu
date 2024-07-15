import { SubscriberEntity, UserEntity, MemberEntity } from '@novu/dal';
import {
  AuthProviderEnum,
  SignUpOriginEnum,
  ISubscriberJwt,
  UserSessionData,
} from '@novu/shared';

export interface IAuthService {
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
    origin?: SignUpOriginEnum
  ): Promise<{ newUser: boolean; token: string }>;
  refreshToken(userId: string): Promise<string>;
  isAuthenticatedForOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean>;
  getUserByApiKey(apiKey: string): Promise<UserSessionData>;
  getSubscriberWidgetToken(subscriber: SubscriberEntity): Promise<string>;
  generateUserToken(user: UserEntity): Promise<string>;
  getSignedToken(
    user: UserEntity,
    organizationId?: string,
    member?: MemberEntity
  ): Promise<string>;

  validateUser(payload: UserSessionData): Promise<UserEntity>;
  validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity | null>;
  isRootEnvironment(payload: UserSessionData): Promise<boolean>;
}
