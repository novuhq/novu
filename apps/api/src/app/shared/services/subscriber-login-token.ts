import { ContextPayload, EnvironmentId, ISubscriberPayload, SubscriberId } from '@novu/shared';

export enum SubscriberTokenScopeEnum {
  CHANNELS_SHARED = 'channels:shared',
}

export type SubscriberLoginProfile = Omit<ISubscriberPayload, 'channels'>;

export type SubscriberLoginClaims = {
  iss: EnvironmentId;
  aud: 'novu';
  sub: SubscriberId;
  context?: ContextPayload;
  subscriber?: SubscriberLoginProfile;
  scope: SubscriberTokenScopeEnum[];
  jti: string;
};
