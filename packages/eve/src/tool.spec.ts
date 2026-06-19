import { describe, expect, it, vi } from 'vitest';
import { novuTool } from './tool.js';

const creds = { secretKey: 'sk_test', agentIdentifier: 'bot', apiBaseUrl: 'https://api.novu.co' };

function okFetch() {
  return vi.fn(async () => new Response('', { status: 200 }));
}

describe('novuTool', () => {
  it('triggers the configured workflow via /v1/events/trigger with the model payload', async () => {
    const fetchImpl = okFetch();
    const tool = novuTool({ description: 'escalate', workflow: 'on-call', credentials: creds, fetch: fetchImpl });

    // The Eve runtime invokes execute(input, ctx); ctx is unused here.
    const result = await (tool.execute as (i: Record<string, unknown>, c: unknown) => Promise<unknown>)(
      { to: 'sub_42', payload: { summary: 'disk full' } },
      {},
    );

    expect(result).toEqual({ triggered: true, workflow: 'on-call' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.novu.co/v1/events/trigger');
    expect(init.headers).toMatchObject({ authorization: 'ApiKey sk_test' });
    expect(JSON.parse(init.body as string)).toEqual({ name: 'on-call', to: 'sub_42', payload: { summary: 'disk full' } });
  });

  it('forwards the whole input as payload when no explicit payload field is present', async () => {
    const fetchImpl = okFetch();
    const tool = novuTool({ description: 'notify', workflow: 'welcome', credentials: creds, fetch: fetchImpl });

    await (tool.execute as (i: Record<string, unknown>, c: unknown) => Promise<unknown>)({ name: 'Ada' }, {});

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'welcome', payload: { name: 'Ada' } });
  });
});
