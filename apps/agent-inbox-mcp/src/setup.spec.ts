import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentInboxApiError } from './agent-inbox-api';
import worker from './index';
import { AGENT_INBOX_API, rpc, setup, stubBackends } from './spec-support';
import { mapSetupHint } from './tools';

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

  it('reads the owner email from the contact list, where the address is not masked', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'verified' } },
      },
    });

    const result = await callSetup();

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('ada@acme.co (confirmed)');
    expect(
      calls.some((call) => call.url.includes('/v1/contacts?') && call.url.includes('subscriberId=operator_1'))
    ).toBe(true);
    expect(calls.some((call) => call.url.includes('/v1/contacts/operator_1'))).toBe(false);
  });

  it('sends a confirmation when an existing agent is given a name but no new handle', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'unverified' } },
      },
    });

    const result = await callSetup({ agent_name: 'Renamed', email: 'ada@acme.co' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('confirmation link');
    expect(result.content[0].text).not.toContain('both agent_name and handle');
    expect(calls.some((call) => call.url === `${AGENT_INBOX_API}/v1/setup`)).toBe(false);
  });

  it('finishes a missing mailbox without renaming the agent', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [],
      operator: { subscriberId: 'operator_1' },
      userEmail: 'ada@acme.co',
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'unverified' } },
      },
    });

    const result = await callSetup({ agent_name: 'Renamed', handle: 'atlas-2' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Agent: Atlas');
    expect(result.content[0].text).toContain('atlas-2@agentinbox.md');
    const created = calls.find((call) => call.url === `${AGENT_INBOX_API}/v1/setup`);
    expect(created?.body).toEqual({ operator: true, inboxHandle: 'atlas-2', email: 'ada@acme.co' });
  });

  it('does not replace an email that is already confirmed', async () => {
    const calls = stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'verified' } },
      },
    });

    const result = await callSetup({ email: 'other@example.com' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('will not replace it');
    expect(calls.some((call) => call.url === `${AGENT_INBOX_API}/v1/contacts/verifications`)).toBe(false);
  });

  it('says the current address still works when a confirmation replaces one', async () => {
    stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [{ integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } }],
      operator: { subscriberId: 'operator_1' },
      contactsById: {
        operator_1: { id: 'operator_1', emailVerification: { address: 'ada@acme.co', status: 'pending' } },
      },
      replacesVerifiedAddress: true,
    });

    const result = await callSetup({ email: 'ada@acme.co' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('still receives email');
  });

  it('reports a channel read failure instead of an empty inbox', async () => {
    stubBackends({
      agent: { agentId: 'agent_1', agentIdentifier: 'human-relay', name: 'Atlas' },
      channels: [],
      channelsError: { status: 503, message: 'Channels are unavailable.' },
      operator: { subscriberId: 'operator_1' },
    });

    const result = await callSetup();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Channels are unavailable.');
    expect(result.content[0].text).not.toContain('not provisioned');
  });
});

describe('mapSetupHint', () => {
  it('points a missing relay at inbox_setup and leaves other missing ids alone', () => {
    expect(mapSetupHint(new AgentInboxApiError(404, 'Relay agent "human-relay" was not found.'))).toContain(
      'inbox_setup'
    );
    expect(mapSetupHint(new AgentInboxApiError(404, 'Inbox thread "conv_1" was not found.'))).toBe(
      'Inbox thread "conv_1" was not found.'
    );
    expect(mapSetupHint(new AgentInboxApiError(404, 'Interaction "hi_1" was not found.'))).toBe(
      'Interaction "hi_1" was not found.'
    );
  });
});
