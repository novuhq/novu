import { IPreferenceChannels } from '@novu/shared';

export class SubscriberPreferenceEntity {
  _subscriberId: string;
  _templateId: string;
  enabled: boolean;
  channels: IPreferenceChannels;
}
