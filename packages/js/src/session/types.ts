import { Subscriber } from '../types';

export type InitializeSessionArgs = {
  /** @deprecated Use subscriber instead */
  subscriberId: string;
  applicationIdentifier: string;
  subscriberHash?: string;
  subscriber?: Subscriber | string;
};
