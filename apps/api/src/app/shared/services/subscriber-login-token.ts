import { ContextPayload, ISubscriberPayload } from '@novu/shared';

export enum SubscriberTokenScopeEnum {
  CHANNELS_SHARED = 'channels:shared',
}

export type SubscriberLoginProfile = Omit<ISubscriberPayload, 'channels'>;

export interface SubscriberLoginClaims {
  /** Environment `_id` the token was minted for. */
  iss: string;
  aud: 'novu';
  /** The customer's `subscriberId`. */
  sub: string;
  context?: ContextPayload;
  subscriber?: SubscriberLoginProfile;
  scope: SubscriberTokenScopeEnum[];
  jti: string;
}
