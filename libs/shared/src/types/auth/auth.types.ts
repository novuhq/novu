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

// @deprecated Use IJwtClaims instead
export type UserSessionData = IJwtClaims;

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  HEADER_API_KEY = 'headerapikey',
}
