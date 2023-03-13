import {
  ChannelTypeEnum,
  IChannelCredentials,
  ISubscriberPayload,
  SubscriberCustomData,
} from '@novu/shared';

export { ISubscriberPayload };

export interface ISubscribers {
  list(page: number);
  get(subscriberId: string);
  identify(subscriberId: string, data: ISubscriberPayload);
  update(subscriberId: string, data: ISubscriberPayload);
  delete(subscriberId: string);
  setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials
  );
  unsetCredentials(subscriberId: string, providerId: string);
  getPreference(subscriberId: string);
  updatePreference(
    subscriberId: string,
    templateId: string,
    data: IUpdateSubscriberPreferencePayload
  );
  getNotificationsFeed(
    subscriberId: string,
    params: IGetSubscriberNotificationFeedParams
  );
  getUnseenCount(subscriberId: string, seen: boolean);
  markMessageSeen(subscriberId: string, messageId: string);
  markMessageActionSeen(subscriberId: string, messageId: string, type: string);
}

export interface IUpdateSubscriberPreferencePayload {
  channel?: {
    type: ChannelTypeEnum;
    enabled: boolean;
  };

  enabled?: boolean;
}
export interface IGetSubscriberNotificationFeedParams {
  page?: number;
  feedIdentifier: string;
  seen?: boolean;
}
