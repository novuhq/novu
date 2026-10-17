import { HttpException, HttpStatus } from '@nestjs/common';

import { getKeylessAgentEnvironmentExpiresAt, KeylessAgentErrorCodeEnum } from './keyless-agent-environment';
import { resolveConnectClaimBaseUrl } from './keyless-signup.helpers';

interface KeylessErrorBody {
  code: KeylessAgentErrorCodeEnum;
  message: string;
  claimUrl?: string;
  expiresAt?: string;
}

export function keylessHttpException(status: HttpStatus, body: KeylessErrorBody): HttpException {
  const extras = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));

  return new HttpException({ statusCode: status, ...extras }, status);
}

export function createKeylessEnvironmentClaimedException(): HttpException {
  return keylessHttpException(HttpStatus.UNAUTHORIZED, {
    code: KeylessAgentErrorCodeEnum.ENVIRONMENT_CLAIMED,
    message: 'This environment was claimed. Use the Development secret key from your Novu dashboard (API Keys).',
  });
}

export function createKeylessEnvironmentExpiredException(
  createdAt: Date | string | undefined,
  status: HttpStatus.UNAUTHORIZED | HttpStatus.BAD_REQUEST = HttpStatus.UNAUTHORIZED
): HttpException {
  const expiresAt = createdAt ? getKeylessAgentEnvironmentExpiresAt(createdAt).toISOString() : undefined;
  const expiredOn = expiresAt ? ` on ${expiresAt}` : '';

  return keylessHttpException(status, {
    code: KeylessAgentErrorCodeEnum.ENVIRONMENT_EXPIRED,
    message: `This keyless environment expired${expiredOn}. Create a new one or sign up at ${resolveConnectClaimBaseUrl()}.`,
    expiresAt,
  });
}
