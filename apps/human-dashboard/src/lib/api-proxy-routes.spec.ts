import { describe, expect, it } from 'vitest';
import { isProxiedRoute } from './api-proxy-routes';

describe('api proxy routes for MCP setup', () => {
  it('forwards the inbox address check and the agent read', () => {
    expect(isProxiedRoute('GET', '/v1/inbox-address')).toBe(true);
    expect(isProxiedRoute('GET', '/v1/agent')).toBe(true);
  });

  it('still forwards setup, operator and verifications', () => {
    expect(isProxiedRoute('POST', '/v1/setup')).toBe(true);
    expect(isProxiedRoute('GET', '/v1/operator')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/contacts/verifications')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/contacts/verifications/voice')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/contacts/verifications/voice/confirm')).toBe(true);
    expect(isProxiedRoute('DELETE', '/v1/contacts/:contactId/voice')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/invites/verify-code')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/invites/voice/remove')).toBe(true);
  });
});

describe('api proxy routes for listen', () => {
  it('forwards the lease, letting go of it, the wait for messages, and typing while a host works', () => {
    expect(isProxiedRoute('POST', '/v1/listen/lease')).toBe(true);
    expect(isProxiedRoute('GET', '/v1/listen/lease')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/listen/lease/release')).toBe(true);
    expect(isProxiedRoute('GET', '/v1/listen/messages')).toBe(true);
    expect(isProxiedRoute('POST', '/v1/listen/typing')).toBe(true);
  });

  it('lets the CLI withdraw a question it sent', () => {
    expect(isProxiedRoute('POST', '/v1/inbox/messages/:messageId/cancel')).toBe(true);
  });

  it('never lets the CLI choose whom the agent listens to: only the dashboard does', () => {
    expect(isProxiedRoute('PATCH', '/v1/contacts/:contactId')).toBe(false);
    expect(isProxiedRoute('DELETE', '/v1/listen/lease')).toBe(false);
  });
});
