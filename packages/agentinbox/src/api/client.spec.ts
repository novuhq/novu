import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';

/** The address a call goes to, read where axios would send it, after the client's own changes. */
async function sentUri(call: (client: ReturnType<typeof createApiClient>) => Promise<unknown>): Promise<string> {
  const client = createApiClient({ apiUrl: 'https://www.agentinbox.md/api', secretKey: 'sk_test' });
  let sent: InternalAxiosRequestConfig | undefined;
  client.axios.defaults.adapter = async (config) => {
    sent = config;

    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };

  await call(client);

  return client.axios.getUri(sent);
}

describe('createApiClient', () => {
  it('leaves the default agent out of the address', async () => {
    const uri = await sentUri((client) =>
      client.axios.get('/v1/inbox', { params: { agentIdentifier: 'human-relay', limit: 5 } })
    );

    expect(uri).toBe('https://www.agentinbox.md/api/v1/inbox?limit=5');
  });

  it('names any other agent', async () => {
    const uri = await sentUri((client) =>
      client.axios.get('/v1/channels', { params: { agentIdentifier: 'ops-relay' } })
    );

    expect(uri).toBe('https://www.agentinbox.md/api/v1/channels?agentIdentifier=ops-relay');
  });
});
