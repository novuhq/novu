export class IChannelSettings {
  _integrationId: string;

  /**
   * @example slack
   */
  providerId: string;

  credentials: IChannelCredentials;
}

export class IChannelCredentials {
  webhookUrl?: string;
  notificationIdentifiers?: string[];
}

export class SubscriberResponseDto {
  _id?: string;

  firstName: string;

  lastName: string;

  email: string;

  phone?: string;

  avatar?: string;

  subscriberId: string;

  channels?: IChannelSettings[];

  _organizationId: string;

  _environmentId: string;
}
