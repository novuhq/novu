import {
  QueryClient,
  QueryObserverOptions,
  QueryObserverResult,
  MutationObserverResult,
} from '@tanstack/query-core';
import io from 'socket.io-client';
import { ApiService, IUserPreferenceSettings, IStoreQuery } from '@novu/client';
import {
  IOrganizationEntity,
  IMessage,
  ButtonTypeEnum,
  MessageActionStatusEnum,
} from '@novu/shared';

import { QueryService } from './query.service';
import type { ISession } from '../utils/types';
import {
  NOTIFICATIONS_QUERY_KEY,
  ORGANIZATION_QUERY_KEY,
  SESSION_QUERY_KEY,
  UNSEEN_COUNT_QUERY_KEY,
  USER_PREFERENCES_QUERY_KEY,
} from '../utils';

export const NOTIFICATION_CENTER_TOKEN_KEY = 'nc_token';
const isBrowser = typeof window !== 'undefined';
const SESSION_NOT_INITIALIZED_ERROR =
  'Session is not initialized, please use the initializeSession method first';

const getToken = (): string | null => {
  if (isBrowser) {
    return localStorage.getItem(NOTIFICATION_CENTER_TOKEN_KEY);
  }

  return null;
};

export interface IHeadlessServiceOptions {
  backendUrl?: string;
  socketUrl?: string;
  applicationIdentifier: string;
  subscriberId?: string;
  subscriberHash?: string;
  queryClient?: QueryClient;
  config?: {
    retry?: number;
    retryDelay?: number;
  };
}

interface IUpdateUserPreferencesVariables {
  templateId: string;
  channelType: string;
  checked: boolean;
}

interface IUpdateActionVariables {
  messageId: string;
  actionButtonType: ButtonTypeEnum;
  status: MessageActionStatusEnum;
  payload?: Record<string, unknown>;
}

export class HeadlessService {
  private api: ApiService;
  private queryClient: QueryClient = null;
  private queryService: QueryService;
  private socket: {
    on: (event: string, listener: (data?: unknown) => void) => void;
    off: (event: string) => void;
    disconnect: () => void;
  } | null = null;
  private session: ISession | null = null;
  private sessionQueryOptions: QueryObserverOptions<ISession, unknown> = {
    queryKey: SESSION_QUERY_KEY,
    cacheTime: Infinity,
    staleTime: Infinity,
    queryFn: () =>
      this.api.initializeSession(
        this.options.applicationIdentifier,
        this.options.subscriberId,
        this.options.subscriberHash
      ),
  };
  private organizationQueryOptions: QueryObserverOptions<
    IOrganizationEntity,
    unknown
  > = {
    queryKey: ORGANIZATION_QUERY_KEY,
    cacheTime: Infinity,
    staleTime: Infinity,
    queryFn: () => this.api.getOrganization(),
  };
  private unseenCountQueryOptions: QueryObserverOptions<
    { count: number },
    unknown
  > = {
    queryKey: UNSEEN_COUNT_QUERY_KEY,
    queryFn: () => this.api.getUnseenCount(),
  };
  private userPreferencesQueryOptions: QueryObserverOptions<
    IUserPreferenceSettings[],
    unknown
  > = {
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: () => this.api.getUserPreference(),
  };

  constructor(private options: IHeadlessServiceOptions) {
    const backendUrl = options.backendUrl ?? 'https://api.novu.co';
    const token = getToken();
    this.api = new ApiService(backendUrl);
    this.applyToken(token);

    this.queryClient =
      options.queryClient ??
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: options?.config?.retry ?? 3,
            ...(options?.config?.retryDelay
              ? { retryDelay: options?.config?.retryDelay }
              : {}),
          },
          mutations: {
            retry: options?.config?.retry ?? 3,
            ...(options?.config?.retryDelay
              ? { retryDelay: options?.config?.retryDelay }
              : {}),
          },
        },
      });
    this.queryService = new QueryService(this.queryClient);
  }

  private assertSessionInitialized() {
    if (!this.session) {
      throw new Error(SESSION_NOT_INITIALIZED_ERROR);
    }
  }

  private applyToken(newToken: string | null) {
    if (newToken) {
      isBrowser &&
        localStorage.setItem(NOTIFICATION_CENTER_TOKEN_KEY, newToken);
      this.api.setAuthorizationToken(newToken);
    } else {
      isBrowser && localStorage.removeItem(NOTIFICATION_CENTER_TOKEN_KEY);
      this.api.disposeAuthorizationToken();
    }
  }

  private initializeSocket(token: string | null) {
    const socketUrl = this.options.socketUrl ?? 'https://ws.novu.co';

    if (this.socket) {
      this.socket.disconnect();
    }

    if (token) {
      this.socket = io(socketUrl, {
        reconnectionDelayMax: 10000,
        transports: ['websocket'],
        query: {
          token: `${token}`,
        },
      });

      this.socket.on('connect_error', (e) => {
        // eslint-disable-next-line no-console
        console.error(e);
      });
    }
  }

  public initializeSession({
    listener,
    onSuccess,
    onError,
  }: {
    listener: (result: QueryObserverResult<ISession>) => void;
    onSuccess?: (session: ISession) => void;
    onError?: (error: unknown) => void;
  }) {
    this.session = null;
    this.queryClient.clear();

    const { unsubscribe } = this.queryService.subscribeQuery({
      options: {
        ...this.sessionQueryOptions,
        onSuccess: (session) => {
          this.session = session;
          this.applyToken(session.token);
          this.initializeSocket(session.token);
          onSuccess?.(session);
        },
        onError,
      },
      listener,
    });

    return unsubscribe;
  }

  public async fetchOrganization({
    listener,
    onSuccess,
    onError,
  }: {
    listener: (result: QueryObserverResult<IOrganizationEntity>) => void;
    onSuccess?: (session: IOrganizationEntity) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { unsubscribe } = this.queryService.subscribeQuery({
      options: {
        ...this.organizationQueryOptions,
        onSuccess,
        onError,
      },
      listener,
    });

    return unsubscribe;
  }

  public fetchUnseenCount({
    listener,
    onSuccess,
    onError,
  }: {
    listener: (result: QueryObserverResult<{ count: number }>) => void;
    onSuccess?: (data: { count: number }) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { unsubscribe } = this.queryService.subscribeQuery({
      options: {
        ...this.unseenCountQueryOptions,
        onSuccess,
        onError,
      },
      listener,
    });

    return unsubscribe;
  }

  public listenUnseenCountChange({
    listener,
  }: {
    listener: (unseenCount: number) => void;
  }) {
    this.assertSessionInitialized();

    if (this.socket) {
      this.socket.on(
        'unseen_count_changed',
        (data?: { unseenCount: number }) => {
          if (!isNaN(data?.unseenCount)) {
            this.queryClient.removeQueries(NOTIFICATIONS_QUERY_KEY, {
              exact: false,
            });
            this.queryClient.setQueryData<{ count: number }>(
              UNSEEN_COUNT_QUERY_KEY,
              (oldData) => ({ count: data?.unseenCount ?? oldData.count })
            );
            listener(data.unseenCount);
          }
        }
      );
    }

    return () => {
      if (this.socket) {
        this.socket.off('unseen_count_changed');
      }
    };
  }

  public fetchNotifications({
    page = 0,
    storeId = 'default_store',
    query = {},
    listener,
    onSuccess,
    onError,
  }: {
    page?: number;
    storeId?: string;
    query?: IStoreQuery;
    listener: (result: QueryObserverResult<IMessage[]>) => void;
    onSuccess?: (messages: IMessage[]) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { unsubscribe } = this.queryService.subscribeQuery({
      options: {
        queryKey: [...NOTIFICATIONS_QUERY_KEY, storeId, page, query],
        queryFn: () => this.api.getNotificationsList(page, query),
        onSuccess,
        onError,
      },
      listener,
    });

    return unsubscribe;
  }

  public fetchUserPreferences({
    listener,
    onSuccess,
    onError,
  }: {
    listener: (result: QueryObserverResult<IUserPreferenceSettings[]>) => void;
    onSuccess?: (messages: IUserPreferenceSettings[]) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { unsubscribe } = this.queryService.subscribeQuery({
      options: {
        ...this.userPreferencesQueryOptions,
        onSuccess,
        onError,
      },
      listener,
    });

    return unsubscribe;
  }

  public async updateUserPreferences({
    templateId,
    channelType,
    checked,
    listener,
    onSuccess,
    onError,
  }: {
    templateId: IUpdateUserPreferencesVariables['templateId'];
    channelType: IUpdateUserPreferencesVariables['channelType'];
    checked: IUpdateUserPreferencesVariables['checked'];
    listener: (
      result: MutationObserverResult<
        IUserPreferenceSettings,
        unknown,
        IUpdateUserPreferencesVariables
      >
    ) => void;
    onSuccess?: (settings: IUserPreferenceSettings) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { result, unsubscribe } = this.queryService.subscribeMutation({
      options: {
        mutationFn: (variables) =>
          this.api.updateSubscriberPreference(
            variables.templateId,
            variables.channelType,
            variables.checked
          ),
        onSuccess: (data) => {
          this.queryClient.setQueryData<IUserPreferenceSettings[]>(
            USER_PREFERENCES_QUERY_KEY,
            (oldUserPreferences) =>
              oldUserPreferences.map((setting) => {
                if (setting.template._id === data.template._id) {
                  return data;
                }

                return setting;
              })
          );
        },
      },
      listener,
    });

    result
      .mutate({ templateId, channelType, checked })
      .then((data) => {
        onSuccess?.(data);

        return data;
      })
      .catch((error) => {
        onError?.(error);
      })
      .finally(() => {
        unsubscribe();
      });
  }

  public async markNotificationsAsRead({
    messageId,
    listener,
    onSuccess,
    onError,
  }: {
    messageId: string | string[];
    listener: (
      result: MutationObserverResult<
        IMessage,
        unknown,
        { messageId: string | string[] }
      >
    ) => void;
    onSuccess?: (message: IMessage) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { result, unsubscribe } = this.queryService.subscribeMutation({
      options: {
        mutationFn: (variables) =>
          this.api.markMessageAs(variables.messageId, {
            seen: true,
            read: true,
          }),
        onSuccess: (data) => {
          this.queryClient.setQueriesData<IMessage[]>(
            { queryKey: NOTIFICATIONS_QUERY_KEY, exact: false },
            (oldMessages) =>
              oldMessages.map((message) => {
                if (message._id === data._id) {
                  return data;
                }

                return message;
              })
          );
        },
      },
      listener,
    });

    result
      .mutate({ messageId })
      .then((data) => {
        onSuccess?.(data);

        return data;
      })
      .catch((error) => {
        onError?.(error);
      })
      .finally(() => {
        unsubscribe();
      });
  }

  public async updateAction({
    messageId,
    actionButtonType,
    status,
    payload,
    listener,
    onSuccess,
    onError,
  }: {
    messageId: IUpdateActionVariables['messageId'];
    actionButtonType: IUpdateActionVariables['actionButtonType'];
    status: IUpdateActionVariables['status'];
    payload?: IUpdateActionVariables['payload'];
    listener: (
      result: MutationObserverResult<IMessage, unknown, IUpdateActionVariables>
    ) => void;
    onSuccess?: (data: IMessage) => void;
    onError?: (error: unknown) => void;
  }) {
    this.assertSessionInitialized();

    const { result, unsubscribe } = this.queryService.subscribeMutation({
      options: {
        mutationFn: (variables) =>
          this.api.updateAction(
            variables.messageId,
            variables.actionButtonType,
            variables.status,
            variables.payload
          ),
        onSuccess: (data) => {
          this.queryClient.setQueriesData<IMessage[]>(
            { queryKey: NOTIFICATIONS_QUERY_KEY, exact: false },
            (oldMessages) =>
              oldMessages.map((message) => {
                if (message._id === messageId) {
                  return data;
                }

                return message;
              })
          );
        },
      },
      listener,
    });

    result
      .mutate({ messageId, actionButtonType, status, payload })
      .then((data) => {
        onSuccess?.(data);

        return data;
      })
      .catch((error) => {
        onError?.(error);
      })
      .finally(() => {
        unsubscribe();
      });
  }
}
