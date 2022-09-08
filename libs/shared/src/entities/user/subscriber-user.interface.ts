export interface ISubscriberJwt {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId?: string;
  environmentId?: string;
  organizationAdminId?: string;
  aud: 'widget_user';
}
