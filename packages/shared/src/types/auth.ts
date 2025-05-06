export enum SignUpOriginEnum {
  WEB = 'web',
  CLI = 'cli',
  VERCEL = 'vercel',
}

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
