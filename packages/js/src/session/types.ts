import { Subscriber } from '../types';

export type KeylessInitializeSessionArgs = {};

export type InitializeSessionArgs =
  | KeylessInitializeSessionArgs
  | {
      applicationIdentifier?: string;
      subscriber?: Subscriber;
      subscriberHash?: string;
    };
