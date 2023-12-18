export interface IJwtPayload {
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

export enum ApiAuthSchemeEnum {
  BEARER = 'Bearer',
  API_KEY = 'ApiKey',
}

export enum PassportStrategyEnum {
  JWT = 'jwt',
  HEADER_API_KEY = 'headerapikey',
}
