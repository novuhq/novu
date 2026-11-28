import { UnauthorizedException } from '@nestjs/common';
import { SubscriberEntity } from '@novu/dal';
import { ContextPayload, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import jwt from 'jsonwebtoken';
import {
  SubscriberLoginProfile,
  SubscriberTokenScopeEnum,
  TokenVerification,
} from '../../../shared/services/novu-tokens.service';
import { invalidHmacHashError } from '../../utils/encryption';

export type SubscriberLoginGrant =
  | { isExpired: true; environmentId: string }
  | {
      isExpired: false;
      environmentId: string;
      subscriberId: string;
      expiresAt: number;
      profile?: SubscriberLoginProfile;
      context?: ContextPayload;
      scope: SubscriberTokenScopeEnum[];
    };

const SCOPES = new Set<unknown>(Object.values(SubscriberTokenScopeEnum));

export function subscriberTokenExpiredError(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    message: 'The subscriber token has expired.',
    error: 'subscriber_token_expired',
  });
}

export function parseSubscriberLoginGrant(verification: TokenVerification): SubscriberLoginGrant {
  if (!verification.ok && verification.reason === 'invalid') {
    throw invalidHmacHashError();
  }

  const { claims } = verification;
  const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
  if (
    claims.aud !== 'novu' ||
    !isNonEmptyString(claims.iss) ||
    !isNonEmptyString(claims.sub) ||
    typeof claims.exp !== 'number' ||
    'topic' in claims ||
    !isValidScope(claims.scope)
  ) {
    throw invalidHmacHashError();
  }

  if (!verification.ok) {
    return { isExpired: true, environmentId: claims.iss };
  }

  return {
    isExpired: false,
    environmentId: claims.iss,
    subscriberId: claims.sub,
    expiresAt: claims.exp,
    profile: claims.subscriber,
    context: claims.context,
    scope: claims.scope ?? [],
  };
}

function isValidScope(scope: unknown): boolean {
  return scope === undefined || (Array.isArray(scope) && scope.every((value) => SCOPES.has(value)));
}

export function signTokenSession(
  subscriber: SubscriberEntity,
  contextKeys: string[],
  expiresAt: number,
  scope: SubscriberTokenScopeEnum[]
): string {
  return jwt.sign(
    {
      _id: subscriber._id,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      email: subscriber.email,
      organizationId: subscriber._organizationId,
      environmentId: subscriber._environmentId,
      subscriberId: subscriber.subscriberId,
      contextKeys,
      authMethod: SubscriberSessionAuthMethodEnum.TOKEN,
      scope,
      exp: expiresAt,
    },
    `${process.env.JWT_SECRET}`,
    { algorithm: 'HS256', issuer: 'novu_api', audience: 'widget_user' }
  );
}
