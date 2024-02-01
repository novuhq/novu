import {
  ButtonTypeEnum,
  ChannelTypeEnum,
  IMessage,
  IOrganizationEntity,
  IPaginatedResponse,
  MessageActionStatusEnum,
  WebSocketEventEnum,
} from '@novu/shared';
import {
  MutationObserverResult,
  QueryObserverResult,
} from '@tanstack/query-core';

import {
  IStoreQuery,
  IUserGlobalPreferenceSettings,
  IUserPreferenceSettings,
} from '@novu/client';

export {
  ButtonTypeEnum,
  ChannelTypeEnum,
  IMessage,
  IOrganizationEntity,
  IPaginatedResponse,
  IStoreQuery,
  IUserGlobalPreferenceSettings,
  IUserPreferenceSettings,
  MessageActionStatusEnum,
  WebSocketEventEnum,
};

export interface IHeadlessServiceOptions {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier: string;
  subscriberId?: string;
  subscriberHash?: string;
  config?: {
    retry?: number;
    retryDelay?: number;
  };
}

export interface IUpdateUserPreferencesVariables {
  templateId: string;
  channelType: string;
  checked: boolean;
}

export interface IUpdateUserGlobalPreferencesVariables {
  preferences?: { channelType: ChannelTypeEnum; enabled: boolean }[];
  enabled?: boolean;
}

export interface IUpdateActionVariables {
  messageId: string;
  actionButtonType: ButtonTypeEnum;
  status: MessageActionStatusEnum;
  payload?: Record<string, unknown>;
}

export type FetchResult<T = unknown> = Pick<
  QueryObserverResult<T>,
  'data' | 'error' | 'status' | 'isLoading' | 'isFetching' | 'isError'
>;

export type UpdateResult<
  TData = unknown,
  TError = unknown,
  TVariables = unknown
> = Pick<
  MutationObserverResult<TData, TError, TVariables>,
  'data' | 'error' | 'status' | 'isLoading' | 'isError'
>;

export type IMessageId = string | string[];
export type IFeedId = string | string[];
