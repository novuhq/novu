import type { Context, NovuOptions, Subscriber } from '../types';
import { buildSubscriber } from '../utils/build-subscriber';
import { fromTokenEndpoint, type GetToken } from './token-source';

export type SubscriberIdentity = {
  kind: 'subscriber';
  applicationIdentifier: string;
  subscriber: Subscriber;
  subscriberHash?: string;
  context?: Context;
  contextHash?: string;
};

export type TokenIdentity = {
  kind: 'token';
  applicationIdentifier: string;
  getToken: GetToken;
  initialToken?: string;
};

export type SessionIdentity = SubscriberIdentity | TokenIdentity;

function ignoredIdentityWarning(options: NovuOptions, subscriber: Subscriber): string[] {
  const ignored = [
    subscriber.subscriberId && (options.subscriber ? 'subscriber' : 'subscriberId'),
    options.context && 'context',
    options.subscriberHash && 'subscriberHash',
    options.contextHash && 'contextHash',
  ].filter((prop): prop is string => Boolean(prop));
  if (!ignored.length) {
    return [];
  }
  const hashNote =
    options.subscriberHash || options.contextHash
      ? ' The token is preferred over HMAC hashes, so you can remove them.'
      : '';

  return [
    `[Novu] ${ignored.join(', ')} ${ignored.length > 1 ? 'are' : 'is'} ignored because a token source ` +
      `(tokenEndpoint or getToken) is set: the token decides who the user is.${hashNote}`,
  ];
}

function unsignedSubscriberWarning(options: NovuOptions, subscriber: Subscriber): string[] {
  if (!options.applicationIdentifier || !subscriber.subscriberId || options.subscriberHash) {
    return [];
  }

  return [
    '[Novu] No subscriberHash is set, so anyone who knows the subscriberId can open this Inbox as that ' +
      'subscriber. Pass tokenEndpoint (or getToken) to sign users in from your backend instead.',
  ];
}

export function resolveSessionIdentity(options: NovuOptions): { identity: SessionIdentity; warnings: string[] } {
  const subscriber = buildSubscriber({ subscriberId: options.subscriberId, subscriber: options.subscriber });
  const applicationIdentifier = options.applicationIdentifier ?? '';
  const getToken = options.getToken ?? (options.tokenEndpoint ? fromTokenEndpoint(options.tokenEndpoint) : undefined);

  if (getToken) {
    return {
      identity: { kind: 'token', applicationIdentifier, getToken, initialToken: options.initialToken },
      warnings: ignoredIdentityWarning(options, subscriber),
    };
  }

  return {
    identity: {
      kind: 'subscriber',
      applicationIdentifier,
      subscriber,
      subscriberHash: options.subscriberHash,
      context: options.context,
      contextHash: options.contextHash,
    },
    warnings: unsignedSubscriberWarning(options, subscriber),
  };
}

const printedWarnings = new Set<string>();

export function warnOnce(message: string): void {
  if (printedWarnings.has(message)) {
    return;
  }
  printedWarnings.add(message);
  console.warn(message);
}
