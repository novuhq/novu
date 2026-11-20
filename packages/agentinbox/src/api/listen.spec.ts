import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { isOutage } from './listen';

function failed(status: number, body: unknown = {}, code?: string): ApiError {
  return new ApiError('Failed', status, 'POST https://www.agentinbox.md/api/v1/inbox/messages', body, code);
}

describe('isOutage', () => {
  it('is one when Agent Inbox wasn’t reached, took too long, or failed itself', () => {
    expect(isOutage(failed(0, undefined, 'ECONNREFUSED'))).toBe(true);
    expect(isOutage(failed(0, undefined, 'ECONNRESET'))).toBe(true);
    expect(isOutage(failed(408))).toBe(true);
    expect(isOutage(failed(500))).toBe(true);
    expect(isOutage(failed(503))).toBe(true);
  });

  it('is one when Agent Inbox was too busy for a moment, but not when a limit of its own holds', () => {
    expect(isOutage(failed(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' }))).toBe(true);
    expect(isOutage(failed(429, { code: 'human_message_daily_cap', retryAfterSeconds: 3600 }))).toBe(false);
  });

  it('isn’t one when Agent Inbox refused the call', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(isOutage(failed(status))).toBe(false);
    }
    expect(isOutage(new Error('boom'))).toBe(false);
  });
});
