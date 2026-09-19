import type { Context, DefaultSchedule, NovuSocketOptions, StandardNovuOptions, Subscriber } from '@novu/js';
import type { InboxProps as JsInboxProps, NovuUIOptions, Tab } from '@novu/js/ui';

type SubscriberProps =
  | {
      subscriberId: string;
      subscriber?: never;
    }
  | {
      subscriber: Subscriber | string;
      subscriberId?: never;
    }
  | {
      subscriber?: never;
      subscriberId?: never;
    };

type ConnectionProps = {
  applicationIdentifier?: string;
  subscriberHash?: string;
  contextHash?: string;
  apiUrl?: string;
  backendUrl?: string;
  socketUrl?: string;
  socketOptions?: NovuSocketOptions;
  useCache?: boolean;
  defaultSchedule?: DefaultSchedule;
  context?: Context;
} & SubscriberProps;

type UIProps = Pick<
  NovuUIOptions,
  'appearance' | 'localization' | 'tabs' | 'preferencesFilter' | 'preferenceGroups' | 'preferencesSort' | 'routerPush'
>;

export type ClientOptions = Omit<StandardNovuOptions, 'subscriber' | 'subscriberId'> & {
  subscriber: Subscriber;
};

export type InboxProps = ConnectionProps & UIProps & JsInboxProps;

export type { Context, DefaultSchedule, NovuSocketOptions, Subscriber, Tab };
