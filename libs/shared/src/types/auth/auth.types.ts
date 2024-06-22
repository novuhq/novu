export interface IJwtClaims {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  organizationId: string;
  roles: string[];
  exp: number;
}

export type UserSessionData = IJwtClaims & { environmentId: string };

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  HEADER_API_KEY = 'headerapikey',
}
