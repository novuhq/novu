import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardToNovuApi } from './api-proxy';
import { AGENT_INBOX_CLIENT_IP_HEADER, AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER } from './client-ip-signature';

vi.mock('server-only', () => ({}));
vi.mock('./human-agent-api', () => ({ RELAY_AGENT_IDENTIFIER: 'human-relay' }));

/** `agentinbox connect` as Vercel hands it over: the visitor in `x-forwarded-for`, and copies the caller slipped in. */
function connectRequest(): NextRequest {
  return new NextRequest('https://www.agentinbox.md/api/v1/connect', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7, 76.76.21.9',
      [AGENT_INBOX_CLIENT_IP_HEADER]: '198.51.100.20',
      [AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER]: '1795392000.forged',
    },
    body: JSON.stringify({ agent: 'atlas', code: 'ABCD-EFGH' }),
  });
}

describe('forwardToNovuApi and the caller’s IP address', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 23));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function sentHeaders(): Headers {
    return fetchMock.mock.calls[0]?.[1]?.headers as Headers;
  }

  it('signs the visitor from x-forwarded-for, not the copies the caller sent', async () => {
    vi.stubEnv('AGENT_INBOX_DASHBOARD_API_SECRET', 'agent-inbox-test-secret');

    await forwardToNovuApi(connectRequest());

    // The same vector as `client-ip-signature.spec.ts` and the API's `client-ip.spec.ts`.
    expect(sentHeaders().get(AGENT_INBOX_CLIENT_IP_HEADER)).toBe('203.0.113.7');
    expect(sentHeaders().get(AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER)).toBe(
      '1795392000.efc2847df3540c3a90a333020cec69c6546fe930cd22611656ae6cd214da4828'
    );
    expect(sentHeaders().get('x-forwarded-for')).toBe('203.0.113.7');
  });

  it('sends neither signed header without the secret, only x-forwarded-for', async () => {
    vi.stubEnv('AGENT_INBOX_DASHBOARD_API_SECRET', '');

    await forwardToNovuApi(connectRequest());

    expect(sentHeaders().get(AGENT_INBOX_CLIENT_IP_HEADER)).toBeNull();
    expect(sentHeaders().get(AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER)).toBeNull();
    expect(sentHeaders().get('x-forwarded-for')).toBe('203.0.113.7');
  });
});
