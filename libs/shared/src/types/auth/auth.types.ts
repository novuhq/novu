import { JwtPayload } from '@clerk/types';
import { SignUpOriginEnum } from '../analytics';

export interface IJwtClaims {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  organizationId: string;
  roles: string[];
  exp: number;
  iss?: string;
  scheme: ApiAuthSchemeEnum.BEARER | ApiAuthSchemeEnum.API_KEY;
}

// JWT payload + custom claims
export type ClerkJwtPayload = JwtPayload & {
  _id: string;
  email: string;
  lastName: string;
  firstName: string;
  environmentId: string; // TODO
  profilePicture: string;
  externalId?: string;
  externalOrgId?: string;
};

export type UserSessionData = IJwtClaims & { environmentId: string };

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  JWT_CLERK = 'jwt-clerk',
  HEADER_API_KEY = 'headerapikey',
}

export type SentryUser = {
  id: string;
  username: string;
  domain: string;
};

export type HandledUser = (IJwtClaims & SentryUser) | false;

export const NONE_AUTH_SCHEME = 'None';

export type AuthenticateContext = {
  invitationToken?: string;
  origin?: SignUpOriginEnum;
};
