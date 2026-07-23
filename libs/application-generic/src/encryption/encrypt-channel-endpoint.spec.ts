import { ENDPOINT_TYPES } from '@novu/shared';
import { describe, expect, it } from 'vitest';

import { decryptChannelEndpoint, encryptChannelEndpoint } from './encrypt-channel-endpoint';

describe('encryptChannelEndpoint / decryptChannelEndpoint', () => {
  const novuSubMask = 'nvsk.';

  it('encrypts tool_webhook url with the Novu encryption prefix and round-trips', () => {
    const endpoint = { url: 'https://hooks.example.com/inbound' };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, endpoint);

    expect(encrypted.url.startsWith(novuSubMask)).toBe(true);
    expect(encrypted.url).not.toEqual(endpoint.url);

    const decrypted = decryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, encrypted);
    expect(decrypted.url).toEqual(endpoint.url);
  });

  it('encrypts tool_webhook header values and leaves header keys and method plaintext', () => {
    const endpoint = {
      url: 'https://hooks.example.com/inbound',
      headers: { Authorization: 'Bearer secret-token', 'X-Custom': 'value' },
      method: 'POST' as const,
    };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, endpoint);

    expect(encrypted.method).toEqual('POST');
    expect(Object.keys(encrypted.headers!)).toEqual(['Authorization', 'X-Custom']);
    expect(encrypted.headers!.Authorization.startsWith(novuSubMask)).toBe(true);
    expect(encrypted.headers!.Authorization).not.toEqual(endpoint.headers.Authorization);
    expect(encrypted.headers!['X-Custom'].startsWith(novuSubMask)).toBe(true);

    const decrypted = decryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, encrypted);
    expect(decrypted.headers).toEqual(endpoint.headers);
    expect(decrypted.method).toEqual(endpoint.method);
  });

  it('encrypts pagerduty_service routingKey and preserves region as plaintext', () => {
    const endpoint = { routingKey: 'R0UTINGK3YEXAMPLE000000000000000', region: 'eu' as const };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.PAGERDUTY_SERVICE, endpoint);

    expect(encrypted.routingKey.startsWith(novuSubMask)).toBe(true);
    expect(encrypted.routingKey).not.toEqual(endpoint.routingKey);
    expect(encrypted.region).toEqual('eu');

    const decrypted = decryptChannelEndpoint(ENDPOINT_TYPES.PAGERDUTY_SERVICE, encrypted);
    expect(decrypted.routingKey).toEqual(endpoint.routingKey);
    expect(decrypted.region).toEqual('eu');
  });

  it('encrypts opsgenie_integration apiKey and preserves region as plaintext', () => {
    const endpoint = { apiKey: 'eb243592-faa2-4ba2-a551-1afdf565c889', region: 'eu' as const };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, endpoint);

    expect(encrypted.apiKey.startsWith(novuSubMask)).toBe(true);
    expect(encrypted.apiKey).not.toEqual(endpoint.apiKey);
    expect(encrypted.region).toEqual('eu');

    const decrypted = decryptChannelEndpoint(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, encrypted);
    expect(decrypted.apiKey).toEqual(endpoint.apiKey);
    expect(decrypted.region).toEqual('eu');
  });

  it('passes through unknown endpoint types unchanged (e.g. chat webhook)', () => {
    const endpoint = { url: 'https://hooks.slack.com/services/T/B/X', channel: '#alerts' };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.WEBHOOK, endpoint);

    expect(encrypted).toEqual(endpoint);
    expect(encrypted.url).toEqual(endpoint.url);

    const decrypted = decryptChannelEndpoint(ENDPOINT_TYPES.WEBHOOK, encrypted);
    expect(decrypted).toEqual(endpoint);
  });

  it('encryption and decryption are idempotent', () => {
    const endpoint = {
      url: 'https://hooks.example.com/inbound',
      headers: { Authorization: 'Bearer secret' },
    };
    const onePass = encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, endpoint);
    const twoPass = encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, onePass);

    expect(twoPass).toEqual(onePass);

    const legacy = { url: 'https://hooks.example.com/legacy' };
    const decryptedLegacy = decryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, legacy);
    expect(decryptedLegacy.url).toEqual(legacy.url);
  });

  it('skips empty-string values', () => {
    const endpoint = {
      url: '',
      headers: { Authorization: '', 'X-Custom': 'value' },
    };
    const encrypted = encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, endpoint);

    expect(encrypted.url).toEqual('');
    expect(encrypted.headers!.Authorization).toEqual('');
    expect(encrypted.headers!['X-Custom'].startsWith(novuSubMask)).toBe(true);
  });
});
