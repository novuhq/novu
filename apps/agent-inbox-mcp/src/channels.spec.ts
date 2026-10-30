import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInboxApiError, createAgentInboxApi } from './agent-inbox-api';
import { channelAdd } from './channels';
import worker from './index';
import { AGENT_INBOX_API, rpc, type StubChannelApp, setup, stubBackends } from './spec-support';
import { mapSetupHint } from './tools';

const TELEGRAM_APP: StubChannelApp = {
  _id: 'app_telegram',
  identifier: 'telegram-atlas',
  providerId: 'telegram',
  channel: 'chat',
};
const SLACK_APP: StubChannelApp = { _id: 'app_slack', identifier: 'slack-atlas', providerId: 'slack', channel: 'chat' };
const EMAIL_LINK = { integration: { providerId: 'agent-email-inbox', sharedInboundAddress: 'atlas@agentinbox.md' } };

const EXPIRES_AT = '2026-10-30T12:15:00.000Z';
const WHAT_NEXT = 'After they finish, or if it stops working, call channel_add again.';
const SLACK_INSTALL_URL = 'https://slack.com/oauth/v2/authorize?client_id=1';
const CHANNELS_CALLS = `${AGENT_INBOX_API}/v1/channels`;

/** An account whose agent has this integration linked. */
const linkedTo = (app: StubChannelApp) => ({ channels: [EMAIL_LINK, { integration: app }], channelApps: [app] });

async function callChannelAdd(channel: string, env = setup()) {
  const response = await worker.fetch(
    rpc('tools/call', { name: 'channel_add', arguments: { channel } }),
    env.env,
    env.ctx
  );
  const result = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

  return result.result;
}

/** The tool's work without the server around it, and without really waiting. Says how long it asked to wait. */
async function addChannel(channel: 'telegram' | 'slack') {
  const waits: number[] = [];
  const api = createAgentInboxApi({ agentInboxUserId: 'user_1', apiUrl: AGENT_INBOX_API, secretKey: 'account-key' });
  const text = await channelAdd(api, { channel }, async (ms) => {
    waits.push(ms);
  });

  return { text, waits };
}

describe('channel_add', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('on Telegram', () => {
    it('gives the setup page when there is no bot yet', async () => {
      const calls = stubBackends({ ...linkedTo(TELEGRAM_APP) });

      const { text } = await addChannel('telegram');

      expect(text).toBe(
        `Telegram needs the user's own bot first. Give them this link to create it: https://agentinbox.example.test/connect#tok_telegram\nIt works until ${EXPIRES_AT}. ${WHAT_NEXT}`
      );
      const setupLink = calls.find((call) => call.url.endsWith('/telegram-link'));
      expect(setupLink?.url).toBe(`${CHANNELS_CALLS}/apps/telegram-atlas/telegram-link`);
      expect(setupLink?.body).toEqual({ subscriberId: 'operator_1' });
    });

    it('gives the /start link and the bot when the bot has not been started', async () => {
      const calls = stubBackends({ ...linkedTo(TELEGRAM_APP), appsWithCredentials: ['telegram-atlas'] });

      const result = await callChannelAdd('telegram');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        `Telegram has its bot, @atlas_bot. Give the user this link and ask them to tap Start: https://t.me/atlas_bot?start=code_1\nIt works until 2026-10-30T12:10:00.000Z. ${WHAT_NEXT}`
      );
      expect(calls.find((call) => call.url === `${CHANNELS_CALLS}/telegram/link`)?.body).toEqual({
        integrationIdentifier: 'telegram-atlas',
        subscriberId: 'operator_1',
      });
      expect(calls.some((call) => call.url.endsWith('/telegram-link'))).toBe(false);
    });

    it('says so when it is already connected, and makes no link', async () => {
      const calls = stubBackends({ ...linkedTo(TELEGRAM_APP), connectedApps: ['telegram-atlas'] });

      const result = await callChannelAdd('telegram');

      expect(result.content[0].text).toBe(
        'Telegram is connected. inbox_send can reach the user there with via: "telegram".'
      );
      const check = calls.find((call) => call.url.startsWith(`${CHANNELS_CALLS}/links`));
      expect(new URL(check?.url ?? '').searchParams.get('subscriberId')).toBe('operator_1');
      expect(new URL(check?.url ?? '').searchParams.get('integrationIdentifier')).toBe('telegram-atlas');
      expect(calls.some((call) => call.method === 'POST' && call.url.startsWith(CHANNELS_CALLS))).toBe(false);
    });
  });

  describe('on Slack', () => {
    it('gives the setup page when there is no app yet', async () => {
      const calls = stubBackends({ ...linkedTo(SLACK_APP) });

      const { text } = await addChannel('slack');

      expect(text).toBe(
        `Slack needs an app in the user's workspace first. Give them this link to create it: https://agentinbox.example.test/connect?channel=slack#tok_slack\nIt works until ${EXPIRES_AT}. ${WHAT_NEXT}`
      );
      const setupLink = calls.find((call) => call.url.includes('/slack-setup-link'));
      expect(setupLink?.url).toBe(`${CHANNELS_CALLS}/apps/app_slack/slack-setup-link?agentIdentifier=human-relay`);
      expect(setupLink?.body).toEqual({ subscriberId: 'operator_1' });
    });

    it('reads credentials without a client id as no app yet', async () => {
      stubBackends({
        ...linkedTo(SLACK_APP),
        channelFailures: {
          'POST /v1/channels/slack/install-link': {
            status: 404,
            message: 'Slack integration missing required OAuth credentials (clientId) ',
          },
        },
      });

      const { text } = await addChannel('slack');

      expect(text).toContain('/connect?channel=slack#tok_slack');
    });

    it('gives the install link when the app has not been installed', async () => {
      const calls = stubBackends({ ...linkedTo(SLACK_APP), appsWithCredentials: ['slack-atlas'] });

      const result = await callChannelAdd('slack');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        `The Slack app is ready. Give the user this link to add it to their workspace: ${SLACK_INSTALL_URL}\nIt works for 5 minutes. ${WHAT_NEXT}`
      );
      expect(calls.find((call) => call.url === `${CHANNELS_CALLS}/slack/install-link`)?.body).toEqual({
        integrationIdentifier: 'slack-atlas',
        subscriberId: 'operator_1',
        connectionMode: 'subscriber',
        autoLinkUser: true,
      });
      expect(calls.some((call) => call.url.includes('/slack-setup-link'))).toBe(false);
    });

    it('says so when it is already connected, and makes no link', async () => {
      const calls = stubBackends({ ...linkedTo(SLACK_APP), connectedApps: ['slack-atlas'] });

      const result = await callChannelAdd('slack');

      expect(result.content[0].text).toBe('Slack is connected. inbox_send can reach the user there with via: "slack".');
      expect(calls.some((call) => call.method === 'POST' && call.url.startsWith(CHANNELS_CALLS))).toBe(false);
    });
  });

  describe('finding the integration', () => {
    it('reuses the one already linked to the agent', async () => {
      const calls = stubBackends({ ...linkedTo(SLACK_APP), appsWithCredentials: ['slack-atlas'] });

      await callChannelAdd('slack');

      expect(calls.some((call) => call.url === `${CHANNELS_CALLS}/apps`)).toBe(false);
      expect(calls.some((call) => call.url.startsWith(`${CHANNELS_CALLS}?`) && call.method === 'POST')).toBe(false);
    });

    it('passes over a linked one that is switched off', async () => {
      const off = { ...TELEGRAM_APP, active: false };
      const calls = stubBackends({ channels: [{ integration: off }], channelApps: [] });

      await callChannelAdd('telegram');

      expect(calls.some((call) => call.url === `${CHANNELS_CALLS}/apps` && call.method === 'POST')).toBe(true);
    });

    it('links one the account has that is not linked yet', async () => {
      const calls = stubBackends({
        agent: { agentId: 'agent_1', agentIdentifier: 'relay/1', name: 'Atlas' },
        channels: [EMAIL_LINK],
        channelApps: [TELEGRAM_APP],
        appsWithCredentials: ['telegram-atlas'],
      });

      const result = await callChannelAdd('telegram');

      expect(result.content[0].text).toContain('@atlas_bot');
      const link = calls.find((call) => call.url.startsWith(`${CHANNELS_CALLS}?`) && call.method === 'POST');
      expect(link?.url).toBe(`${CHANNELS_CALLS}?agentIdentifier=relay%2F1`);
      expect(link?.body).toEqual({ integrationIdentifier: 'telegram-atlas' });
      expect(calls.some((call) => call.url === `${CHANNELS_CALLS}/apps` && call.method === 'POST')).toBe(false);
    });

    it('leaves alone what is not this channel', async () => {
      const calls = stubBackends({
        channels: [EMAIL_LINK],
        channelApps: [SLACK_APP, { ...TELEGRAM_APP, channel: 'email' }],
      });

      await callChannelAdd('telegram');

      expect(calls.find((call) => call.url === `${CHANNELS_CALLS}/apps` && call.method === 'POST')?.body).toMatchObject(
        {
          providerId: 'telegram',
        }
      );
    });

    it('creates one named after the agent when the account has none, and links it', async () => {
      const calls = stubBackends({ channels: [EMAIL_LINK] });

      const result = await callChannelAdd('slack');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('/connect?channel=slack#tok_slack');
      expect(calls.find((call) => call.url === `${CHANNELS_CALLS}/apps` && call.method === 'POST')?.body).toEqual({
        providerId: 'slack',
        channel: 'chat',
        name: 'Atlas',
        active: true,
        credentials: {},
      });
      expect(calls.find((call) => call.url.startsWith(`${CHANNELS_CALLS}?`) && call.method === 'POST')?.body).toEqual({
        integrationIdentifier: 'slack-created',
      });
    });

    it('goes on when linking answers 409', async () => {
      stubBackends({
        channels: [EMAIL_LINK],
        channelApps: [TELEGRAM_APP],
        appsWithCredentials: ['telegram-atlas'],
        channelFailures: {
          'POST /v1/channels': { status: 409, message: 'This integration is already linked to the agent.' },
        },
      });

      const result = await callChannelAdd('telegram');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('@atlas_bot');
    });

    it('stops when linking fails any other way', async () => {
      stubBackends({
        channels: [EMAIL_LINK],
        channelApps: [TELEGRAM_APP],
        channelFailures: { 'POST /v1/channels': { status: 403, message: 'Not allowed here.' } },
      });

      const result = await callChannelAdd('telegram');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Not allowed here.');
    });
  });

  describe('the setup page', () => {
    it.each([
      ['production', 'https://www.agentinbox.md/api', 'https://www.agentinbox.md'],
      ['production, with a slash at the end', 'https://www.agentinbox.md/api/', 'https://www.agentinbox.md'],
      ['staging', 'https://staging.agentinbox.md/api', 'https://staging.agentinbox.md'],
      ['local', 'http://localhost:4300/api', 'http://localhost:4300'],
    ])('is on the site whose API issued the token: %s', async (_environment, apiUrl, site) => {
      stubBackends({ channels: [EMAIL_LINK] });
      const answer = globalThis.fetch;
      vi.stubGlobal('fetch', (url: string, init: RequestInit) =>
        answer(String(url).replace(apiUrl.replace(/\/$/, ''), AGENT_INBOX_API), init)
      );

      const telegram = await callChannelAdd('telegram', setup({ AGENT_INBOX_API_URL: apiUrl }));
      const slack = await callChannelAdd('slack', setup({ AGENT_INBOX_API_URL: apiUrl }));

      expect(telegram.content[0].text).toContain(`${site}/connect#tok_telegram\n`);
      expect(slack.content[0].text).toContain(`${site}/connect?channel=slack#tok_slack\n`);
    });

    it('never gives the address the API made, which is on the Novu dashboard', async () => {
      stubBackends({ channels: [EMAIL_LINK] });

      const telegram = await callChannelAdd('telegram');
      const slack = await callChannelAdd('slack');

      expect(telegram.content[0].text).not.toContain('dashboard.example.test');
      expect(slack.content[0].text).not.toContain('dashboard.example.test');
    });
  });

  describe('a setup page still saving', () => {
    it('waits for a Slack app instead of giving the page again', async () => {
      const calls = stubBackends({
        ...linkedTo(SLACK_APP),
        appsWithCredentials: ['slack-atlas'],
        checksBeforeSaved: 3,
      });

      const { text, waits } = await addChannel('slack');

      expect(text).toContain(SLACK_INSTALL_URL);
      expect(waits).toEqual([2000, 2000, 2000]);
      expect(calls.some((call) => call.url.includes('/slack-setup-link'))).toBe(false);
    });

    it('waits for a Telegram bot instead of giving the page again', async () => {
      const calls = stubBackends({
        ...linkedTo(TELEGRAM_APP),
        appsWithCredentials: ['telegram-atlas'],
        checksBeforeSaved: 1,
      });

      const { text, waits } = await addChannel('telegram');

      expect(text).toContain('@atlas_bot');
      expect(waits).toEqual([2000]);
      expect(calls.some((call) => call.url.endsWith('/telegram-link'))).toBe(false);
    });

    it('gives Slack longer than the 5 seconds the API lets Slack take, then gives the page', async () => {
      stubBackends({ ...linkedTo(SLACK_APP) });

      const { text, waits } = await addChannel('slack');

      expect(waits.reduce((total, ms) => total + ms, 0)).toBeGreaterThan(5000);
      expect(text).toContain('/connect?channel=slack#tok_slack');
    });

    it('stops as soon as the credentials are there', async () => {
      stubBackends({ ...linkedTo(SLACK_APP), appsWithCredentials: ['slack-atlas'], checksBeforeSaved: 1 });

      const { waits } = await addChannel('slack');

      expect(waits).toEqual([2000]);
    });

    it('does not wait when the credentials are saved already', async () => {
      stubBackends({ ...linkedTo(SLACK_APP), appsWithCredentials: ['slack-atlas'] });

      const { waits } = await addChannel('slack');

      expect(waits).toEqual([]);
    });

    it.each(['telegram', 'slack'] as const)('does not wait when no %s page can be open yet', async (channel) => {
      stubBackends({ channels: [EMAIL_LINK] });

      const { text, waits } = await addChannel(channel);

      expect(text).toContain('/connect');
      expect(waits).toEqual([]);
    });

    it('does not wait on anything but missing credentials', async () => {
      stubBackends({
        ...linkedTo(TELEGRAM_APP),
        channelFailures: {
          'POST /v1/channels/telegram/link': { status: 422, message: 'Something else about this request.' },
        },
      });

      await expect(addChannel('telegram')).rejects.toThrow('Something else about this request.');
    });
  });

  describe('when it cannot go on', () => {
    it('says the agent has to be set up first', async () => {
      const calls = stubBackends({ agent: null, operator: null, channels: [] });

      const result = await callChannelAdd('telegram');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Agent Inbox is not set up yet. Ask the user for an agent name and inbox address, call inbox_setup, then call channel_add again.'
      );
      expect(calls.some((call) => call.url.startsWith(CHANNELS_CALLS))).toBe(false);
    });

    it('says the same when the agent has no owner on record', async () => {
      stubBackends({ operator: {}, channels: [] });

      const result = await callChannelAdd('slack');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('call inbox_setup');
    });

    it('passes on what the API says', async () => {
      stubBackends({
        ...linkedTo(TELEGRAM_APP),
        channelFailures: {
          'POST /v1/channels/telegram/link': { status: 502, message: 'Telegram getMe failed: Unauthorized' },
        },
      });

      const result = await callChannelAdd('telegram');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Telegram getMe failed: Unauthorized');
    });

    it('does not mistake another 404 for Slack having no app', async () => {
      const calls = stubBackends({
        ...linkedTo(SLACK_APP),
        channelFailures: {
          'POST /v1/channels/slack/install-link': {
            status: 404,
            message: 'Integration not found: slack-atlas in environment env_1',
          },
        },
      });

      const result = await callChannelAdd('slack');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Integration not found: slack-atlas in environment env_1');
      expect(calls.some((call) => call.url.includes('/slack-setup-link'))).toBe(false);
    });

    it('takes neither email nor anything but the channel', async () => {
      const calls = stubBackends({ channels: [EMAIL_LINK] });
      const { env, ctx } = setup();

      const email = await callChannelAdd('email');
      const list = await worker.fetch(rpc('tools/list', {}), env, ctx);
      const { result } = (await list.json()) as {
        result: { tools: Array<{ name: string; inputSchema: { properties: Record<string, unknown> } }> };
      };

      expect(email.isError).toBe(true);
      expect(calls.some((call) => call.url.startsWith(CHANNELS_CALLS))).toBe(false);
      expect(
        Object.keys(result.tools.find((tool) => tool.name === 'channel_add')?.inputSchema.properties ?? {})
      ).toEqual(['channel']);
    });
  });
});

describe('mapSetupHint for a missing channel', () => {
  it('points at channel_add instead of the CLI', () => {
    const error = new AgentInboxApiError(
      404,
      'No telegram channel is linked to this agent. Connect telegram or run `npx @agentinbox/cli channel add telegram`.'
    );

    expect(mapSetupHint(error)).toBe(
      'No telegram channel is linked to this agent. Call channel_add with channel "telegram" to connect it.'
    );
  });

  it('leaves email in the API’s words, since channel_add does not add it', () => {
    const message =
      'No email channel is linked to this agent. Connect email or run `npx @agentinbox/cli channel add email`.';

    expect(mapSetupHint(new AgentInboxApiError(404, message))).toBe(message);
  });
});
