import { Subscriber } from '../types';

export type InitializeSessionArgs = {
  applicationIdentifier: string;
  subscriber: Subscriber;
  subscriberHash?: string;
};
