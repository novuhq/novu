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
}

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
