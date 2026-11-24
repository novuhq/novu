import { VerifyCredentialsStatusEnum } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { classifyHttpStatus, getErrorHttpStatus, verifyCredentialsWith } from './verify-credentials';

describe('getErrorHttpStatus', () => {
  test.each([
    ['axios error', { response: { status: 401 } }, 401],
    ['Twilio RestException', { status: 404, code: 20404 }, 404],
    ['Vonage VetchError', { code: '401' }, 401],
    ['node network error', { code: 'ECONNRESET' }, undefined],
    ['plain Error', new Error('boom'), undefined],
    ['non-object', 'nope', undefined],
  ])('reads the status off a %s', (_label, error, expected) => {
    expect(getErrorHttpStatus(error)).toBe(expected);
  });
});

describe('classifyHttpStatus', () => {
  test.each([
    [401, VerifyCredentialsStatusEnum.INVALID],
    [403, VerifyCredentialsStatusEnum.INCONCLUSIVE],
    [400, VerifyCredentialsStatusEnum.INCONCLUSIVE],
    [404, VerifyCredentialsStatusEnum.INCONCLUSIVE],
    [408, VerifyCredentialsStatusEnum.UNREACHABLE],
    [429, VerifyCredentialsStatusEnum.UNREACHABLE],
    [503, VerifyCredentialsStatusEnum.UNREACHABLE],
    [undefined, VerifyCredentialsStatusEnum.UNREACHABLE],
  ])('maps %s to %s', (status, expected) => {
    expect(classifyHttpStatus(status)).toBe(expected);
  });
});

describe('verifyCredentialsWith', () => {
  test('reports valid when the request succeeds', async () => {
    const result = await verifyCredentialsWith(async () => ({ ok: true }));

    expect(result.status).toBe(VerifyCredentialsStatusEnum.VALID);
  });

  test('reports invalid on a 401', async () => {
    const result = await verifyCredentialsWith(async () => {
      throw { response: { status: 401 } };
    });

    expect(result.status).toBe(VerifyCredentialsStatusEnum.INVALID);
  });

  test('lets a provider override the mapping', async () => {
    const result = await verifyCredentialsWith(
      async () => {
        throw { response: { status: 404 } };
      },
      (status) => (status === 404 ? VerifyCredentialsStatusEnum.INVALID : undefined)
    );

    expect(result.status).toBe(VerifyCredentialsStatusEnum.INVALID);
  });

  test('never echoes the upstream error message', async () => {
    const result = await verifyCredentialsWith(async () => {
      throw Object.assign(new Error('GET https://api.telegram.org/bot123:SECRET/getMe failed'), {
        response: { status: 401 },
      });
    });

    expect(result.message).not.toContain('SECRET');
  });
});
