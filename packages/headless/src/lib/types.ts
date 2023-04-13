import {
  QueryObserverResult,
  MutationObserverResult,
} from '@tanstack/query-core';
import { ButtonTypeEnum, MessageActionStatusEnum } from '@novu/shared';

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
