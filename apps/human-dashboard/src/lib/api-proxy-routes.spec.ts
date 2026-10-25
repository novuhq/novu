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
  });
});
