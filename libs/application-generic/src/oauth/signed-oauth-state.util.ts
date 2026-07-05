import { BadRequestException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { createHash } from '../utils/hmac';
import { encodeOAuthState, splitOAuthState } from './oauth-state.util';

export const DEFAULT_OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

export type SignedOAuthStatePayload = {
  timestamp: number;
};

export function areHexDigestsEqual(expected: string | null | undefined, provided: string | null | undefined): boolean {
  if (typeof expected !== 'string' || typeof provided !== 'string') {
    return false;
  }

  if (expected.length !== provided.length) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function createSignedOAuthState<T extends SignedOAuthStatePayload>(
  stateData: Omit<T, 'timestamp'>,
  environmentApiKey: string
): string {
  const payload = JSON.stringify({
    ...stateData,
    timestamp: Date.now(),
  });

  const signature = createHash(environmentApiKey, payload);

  if (!signature) {
    throw new BadRequestException('Failed to create OAuth state signature');
  }

  return encodeOAuthState(payload, signature);
}

export function validateSignedOAuthState<T extends SignedOAuthStatePayload>(
  state: string,
  environmentApiKey: string,
  ttlMs: number = DEFAULT_OAUTH_STATE_TTL_MS,
  errorMessage = 'Invalid or expired OAuth state parameter'
): T {
  try {
    const { payload, signature } = splitOAuthState(state);
    const expectedSignature = createHash(environmentApiKey, payload);

    if (!expectedSignature || !areHexDigestsEqual(expectedSignature, signature)) {
      throw new Error('Invalid state signature');
    }

    const data = JSON.parse(payload) as T;

    if (Date.now() - data.timestamp > ttlMs) {
      throw new Error('OAuth state expired');
    }

    return data;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(errorMessage);
  }
}

export function assertOAuthStateFieldsMatch<T extends Record<string, unknown>>(
  decoded: T,
  expected: Partial<T>,
  errorMessage = 'Invalid or expired OAuth state parameter'
): void {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (decoded[key] !== expectedValue) {
      throw new BadRequestException(errorMessage);
    }
  }
}
