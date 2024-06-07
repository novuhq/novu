import { SubscriberEntity, UserEntity, MemberEntity } from '@novu/dal';
import {
  AuthProviderEnum,
  SignUpOriginEnum,
  ISubscriberJwt,
  IJwtClaims,
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
  validateApiKey(apiKey: string): Promise<IJwtClaims>;
  getSubscriberWidgetToken(subscriber: SubscriberEntity): Promise<string>;
  generateUserToken(user: UserEntity): Promise<string>;
  getSignedToken(
    user: UserEntity,
    organizationId?: string,
    member?: MemberEntity,
    environmentId?: string
  ): Promise<string>;

  validateUser(payload: IJwtClaims): Promise<UserEntity>;
  validateSubscriber(payload: ISubscriberJwt): Promise<SubscriberEntity | null>;
  isRootEnvironment(payload: IJwtClaims): Promise<boolean>;
}
