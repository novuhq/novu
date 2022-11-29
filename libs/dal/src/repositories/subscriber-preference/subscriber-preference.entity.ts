import { IPreferenceChannels } from '@novu/shared';

export class SubscriberPreferenceEntity {
  _id?: string;

  _organizationId: string;

  _environmentId: string;

  _subscriberId: string;

  _templateId: string;

  enabled: boolean;

  channels: IPreferenceChannels;
}
