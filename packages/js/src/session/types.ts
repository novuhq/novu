import { DefaultSchedule, Subscriber } from '../types';

export type KeylessInitializeSessionArgs = {} & { [K in string]?: never }; // empty object,disallows all unknown keys

export type InitializeSessionArgs =
  | KeylessInitializeSessionArgs
  | {
      applicationIdentifier: string;
      subscriber: Subscriber;
      subscriberHash?: string;
      defaultSchedule?: DefaultSchedule;
    };
