export interface ISubscriberJwt {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId?: string;
  applicationId?: string;
  aud: 'widget_user';
}
