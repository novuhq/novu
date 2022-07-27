export class SubscriberPreferenceEntity {
  _subscriberId: string;
  _templateId: string;
  enabled: boolean;
  channels: { email: boolean; sms: boolean; in_app: boolean; direct: boolean; push: boolean };
}

// channels: Record<ChannelTypeEnum, boolean>;
