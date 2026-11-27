import { UnauthorizedException } from '@nestjs/common';
import { SubscriberEntity } from '@novu/dal';
import { ContextPayload, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { SubscriberLoginProfile, TokenVerification } from '../../../shared/services/novu-tokens.service';
import { invalidHmacHashError } from '../../utils/encryption';

export type SubscriberLoginGrant =
  | { isExpired: true; environmentId: string }
  | {
      isExpired: false;
      environmentId: string;
      subscriberId: string;
      issuedAt: number;
      expiresAt: number;
      profile?: SubscriberLoginProfile;
      context?: ContextPayload;
    };

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
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    'topic' in claims
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
    issuedAt: claims.iat,
    expiresAt: claims.exp,
    profile: claims.subscriber,
    context: claims.context,
  };
}

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
      authMethod: SubscriberSessionAuthMethodEnum.TOKEN,
      exp: expiresAt,
    },
    `${process.env.JWT_SECRET}`,
    { algorithm: 'HS256', issuer: 'novu_api', audience: 'widget_user' }
  );
}
