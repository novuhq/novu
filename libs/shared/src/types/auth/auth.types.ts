import { JwtPayload } from '@clerk/types';

export interface IJwtClaims {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  organizationId: string;
  environmentId: string;
  roles: string[];
  exp: number;
  iss?: string;
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

// @deprecated Use IJwtClaims instead
export type UserSessionData = IJwtClaims;

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
