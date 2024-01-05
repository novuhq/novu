import {
  ChannelTypeEnum,
  IChannelCredentials,
  ISubscriberPayload,
  ButtonTypeEnum,
  MessageActionStatusEnum,
  ISubscribersDefine,
  PreferenceLevelEnum,
} from '@novu/shared';

export {
  ISubscriberPayload,
  ButtonTypeEnum,
  MessageActionStatusEnum,
  PreferenceLevelEnum,
};

export interface ISubscribers {
  list(page: number, limit: number);
  get(subscriberId: string);
  identify(subscriberId: string, data: ISubscriberPayload);
  bulkCreate(subscribers: ISubscribersDefine[]);
  update(subscriberId: string, data: ISubscriberPayload);
  delete(subscriberId: string);
  setCredentials(
    subscriberId: string,
    providerId: string,
    credentials: IChannelCredentials,
    integrationIdentifier?: string
  );
  deleteCredentials(subscriberId: string, providerId: string);
  /**
   * @deprecated Use deleteCredentials instead
   */
  unsetCredentials(subscriberId: string, providerId: string);
  updateOnlineStatus(subscriberId: string, online: boolean);
  getPreference(subscriberId: string);
  getGlobalPreference(subscriberId: string);
  getPreferenceByLevel(subscriberId: string, level: PreferenceLevelEnum);
  updatePreference(
    subscriberId: string,
    templateId: string,
    data: IUpdateSubscriberPreferencePayload
  );
  updateGlobalPreference(
    subscriberId: string,
    data: IUpdateSubscriberGlobalPreferencePayload
  );
  getNotificationsFeed(
    subscriberId: string,
    params: IGetSubscriberNotificationFeedParams
  );
  getUnseenCount(subscriberId: string, seen: boolean);
  /**
   * deprecated use markMessageAs instead
   */
  markMessageSeen(subscriberId: string, messageId: string);
  /**
   * deprecated use markMessageAs instead
   */
  markMessageRead(subscriberId: string, messageId: string);
  markMessageAs(subscriberId: string, messageId: string, mark: IMarkFields);
  markMessageActionSeen(
    subscriberId: string,
    messageId: string,
    type: string,
    data: IMarkMessageActionFields
  );
}

export interface IUpdateSubscriberPreferencePayload {
  channel?: {
    type: ChannelTypeEnum;
    enabled: boolean;
  };
  enabled?: boolean;
}

export interface IUpdateSubscriberGlobalPreferencePayload {
  preferences?: {
    type: ChannelTypeEnum;
    enabled: boolean;
  }[];
  enabled?: boolean;
}
export interface IGetSubscriberNotificationFeedParams {
  page?: number;
  limit?: number;
  feedIdentifier?: string;
  seen?: boolean;
  read?: boolean;
  payload?: Record<string, unknown>;
}

export interface IMarkFields {
  seen?: boolean;
  read?: boolean;
}

export interface IMarkMessageActionFields {
  status: MessageActionStatusEnum;
  payload?: Record<string, unknown>;
}
