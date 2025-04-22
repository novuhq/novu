export type InitializeSessionArgs = {
  applicationIdentifier: string;
  /** @deprecated Use subscriber instead */
  subscriberId: string;
  subscriberHash?: string;
  subscriber?: Subscriber;
};
