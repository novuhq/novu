import { ChannelTypeEnum, IChannelCredentials } from '@novu/shared';

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

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  [key: string]: string | string[] | boolean | number | undefined;
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
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
