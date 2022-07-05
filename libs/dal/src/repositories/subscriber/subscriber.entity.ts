export class SubscriberEntity {
  _id?: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  notificationIdentifiers?: string[];

  subscriberId: string;

  _organizationId: string;

  _environmentId: string;
}
