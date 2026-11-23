import { UnauthorizedException } from '@nestjs/common';
import { SubscriberEntity } from '@novu/dal';
import { ContextPayload } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { SubscriberLoginProfile, TokenVerification } from '../../../shared/services/novu-tokens.service';
import { invalidHmacHashError } from '../../utils/encryption';

export interface SubscriberLoginGrant {
  environmentId: string;
  subscriberId: string;
  expiresAt: number;
  profile?: SubscriberLoginProfile;
  context?: ContextPayload;
}

export function subscriberTokenExpiredError(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    message: 'The subscriber token has expired.',
    error: 'subscriber_token_expired',
  });
}

/** Throws the bad-hash error for every invalid token, so a caller cannot tell why a token was refused. */
export function parseSubscriberLoginGrant(verification: TokenVerification): SubscriberLoginGrant {
  if (!verification.ok) {
    throw verification.reason === 'expired' ? subscriberTokenExpiredError() : invalidHmacHashError();
  }

  const { claims } = verification;
  const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
  if (
    claims.aud !== 'novu' ||
    !isNonEmptyString(claims.iss) ||
    !isNonEmptyString(claims.sub) ||
    typeof claims.exp !== 'number' ||
    'topic' in claims
  ) {
    throw invalidHmacHashError();
  }

  return {
    environmentId: claims.iss,
    subscriberId: claims.sub,
    expiresAt: claims.exp,
    profile: claims.subscriber,
    context: claims.context,
  };
}

/** The widget session JWT, ending when the login token does. */
export function signTokenSession(subscriber: SubscriberEntity, contextKeys: string[], expiresAt: number): string {
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
      authMethod: 'token',
      exp: expiresAt,
    },
    `${process.env.JWT_SECRET}`,
    { algorithm: 'HS256', issuer: 'novu_api', audience: 'widget_user' }
  );
}
