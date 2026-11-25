import { Context, DefaultSchedule, Subscriber } from '../types';

export type KeylessInitializeSessionArgs = {} & { [K in string]?: never }; // empty object,disallows all unknown keys

export type TokenInitializeSessionArgs = {
  applicationIdentifier: string;
  defaultSchedule?: DefaultSchedule;
};

export type InitializeSessionArgs =
  | KeylessInitializeSessionArgs
  | TokenInitializeSessionArgs
  | {
      applicationIdentifier: string;
      subscriber: Subscriber;
      subscriberHash?: string;
      contextHash?: string;
      defaultSchedule?: DefaultSchedule;
      context?: Context;
    };
