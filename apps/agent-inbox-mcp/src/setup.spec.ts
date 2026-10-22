import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './index';
import { AGENT_INBOX_API, rpc, setup, stubBackends } from './spec-support';

async function callSetup(arguments_: Record<string, unknown> = {}, token: string | null = 'good-token') {
  const { env, ctx } = setup();
  const response = await worker.fetch(
    rpc('tools/call', { name: 'inbox_setup', arguments: arguments_ }, token),
    env,
    ctx
  );
  const result = (await response.json()) as {
    result: { content: Array<{ text: string }>; isError?: boolean };
  };

  return result.result;
}

describe('inbox_setup', () => {
  beforeEach(() => {
    stubBackends({ agent: null, operator: null, channels: [], userEmail: 'ada@acme.co' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports that nothing is set up and offers the Clerk email as a suggestion', async () => {
    const result = await callSetup();

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('not set up yet');
    expect(result.content[0].text).toContain('ada@acme.co');
  });

  it('creates the agent when the handle is free', async () => {
    const calls = stubBackends({ agent: null, operator: null, channels: [], userEmail: 'ada@acme.co' });

    const result = await callSetup({ agent_name: 'Atlas', handle: 'atlas' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Agent: Atlas');
    expect(result.content[0].text).toContain('atlas@agentinbox.md');
    expect(calls.some((call) => call.url === `${AGENT_INBOX_API}/v1/setup` && call.method === 'POST')).toBe(true);
    const created = calls.find((call) => call.url === `${AGENT_INBOX_API}/v1/setup`);
    expect(created?.body).toMatchObject({
      operator: true,
      agentName: 'Atlas',
      inboxHandle: 'atlas',
      email: 'ada@acme.co',
    });
  });

  it('refuses a taken handle without creating anything', async () => {
    const calls = stubBackends({
      agent: null,
      operator: null,
      channels: [],
      inboxAddressCheck: {
        handle: 'atlas',
        available: false,
        suggestion: 'atlas-acme',
        domain: 'agentinbox.md',
      },
    });

    const result = await callSetup({ agent_name: 'Atlas', handle: 'atlas' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('atlas is taken');
    expect(result.content[0].text).toContain('atlas-acme');
    expect(calls.some((call) => call.url === `${AGENT_INBOX_API}/v1/setup`)).toBe(false);
  });

  it('surfaces a taken-handle race from setup with the suggestion', async () => {
    stubBackends({
      agent: null,
      operator: null,
      channels: [],
      inboxAddressCheck: { handle: 'atlas', available: true, domain: 'agentinbox.md' },
      setupError: {
        status: 409,
        code: 'inbox_address_taken',
        message: 'atlas is taken',
        suggestion: 'atlas-2',
      },
    });

    const result = await callSetup({ agent_name: 'Atlas', handle: 'atlas' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('atlas is taken');
    expect(result.content[0].text).toContain('atlas-2');
  });

  it('sends a confirmation link when email is passed', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'unverified' } },
      },
    });

    const result = await callSetup({ email: 'ada@acme.co' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('confirmation link');
    expect(result.content[0].text).toMatch(/pending|waiting/i);
    const verification = calls.find(
      (call) => call.url === `${AGENT_INBOX_API}/v1/contacts/verifications` && call.method === 'POST'
    );
    expect(verification?.body).toMatchObject({
      subscriberId: 'operator_1',
      via: 'email',
      address: 'ada@acme.co',
    });
  });

  it('ignores a new name and handle once an agent exists', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'verified' } },
      },
    });

    const result = await callSetup({ agent_name: 'Renamed', handle: 'renamed' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('ignored');
    expect(result.content[0].text).toContain('Agent: Atlas');
    expect(result.content[0].text).toContain('atlas@agentinbox.md');
    expect(calls.some((call) => call.url === `${AGENT_INBOX_API}/v1/setup`)).toBe(false);
  });

  it('needs both agent_name and handle to create', async () => {
    const result = await callSetup({ agent_name: 'Atlas' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('both agent_name and handle');
  });
});
