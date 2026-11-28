export enum SubscriberSessionAuthMethodEnum {
  HMAC = 'hmac',
  NONE = 'none',
  TOKEN = 'token',
}

export interface ISubscriberJwtDto {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriberId: string;
  organizationId: string;
  environmentId: string;
  contextKeys: string[];
  aud: 'widget_user';
  authMethod?: SubscriberSessionAuthMethodEnum.TOKEN;
  scope?: string[];
}

export interface ISessionDto {
  token: string;
  profile: ISubscriberJwtDto;
}
