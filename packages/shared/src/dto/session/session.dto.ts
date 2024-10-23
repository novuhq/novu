export interface ISubscriberJwtDto {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriberId: string;
  organizationId: string;
  environmentId: string;
  aud: 'widget_user';
}

export interface ISessionDto {
  token: string;
  profile: ISubscriberJwtDto;
}
