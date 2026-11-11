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
const WHAT_NEXT =
  'After they finish, or if it stops working, call channel_add again.\nWhoever opens this link connects as the account owner. Show it to the user in this chat and nowhere else, never through inbox_send or inbox_reply.';
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
async function addChannel(channel: 'telegram' | 'slack' | 'whatsapp') {
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

  describe('with two integrations linked, as after two first calls at once', () => {
    const OLDER_BOT: StubChannelApp = { ...TELEGRAM_APP, _id: 'app_telegram_older', identifier: 'telegram-older' };
    const OLDER_APP: StubChannelApp = { ...SLACK_APP, _id: 'app_slack_older', identifier: 'slack-older' };
    const bothBots = {
      channels: [{ integration: TELEGRAM_APP }, { integration: OLDER_BOT }],
      channelApps: [TELEGRAM_APP, OLDER_BOT],
    };
    const bothApps = {
      channels: [{ integration: SLACK_APP }, { integration: OLDER_APP }],
      channelApps: [SLACK_APP, OLDER_APP],
    };

    it('says it is connected when the person finished on the other one', async () => {
      const calls = stubBackends({ ...bothBots, connectedApps: ['telegram-older'] });

      const { text } = await addChannel('telegram');

      expect(text).toBe('Telegram is connected. inbox_send can reach the user there with via: "telegram".');
      expect(calls.some((call) => call.method === 'POST' && call.url.startsWith(CHANNELS_CALLS))).toBe(false);
    });

    it('gives the /start link of the one that has a bot, not a new setup page', async () => {
      const calls = stubBackends({ ...bothBots, appsWithCredentials: ['telegram-older'] });

      const { text } = await addChannel('telegram');

      expect(text).toContain('https://t.me/atlas_bot?start=code_1');
      expect(calls.filter((call) => call.url === `${CHANNELS_CALLS}/telegram/link`).at(-1)?.body).toEqual({
        integrationIdentifier: 'telegram-older',
        subscriberId: 'operator_1',
      });
      expect(calls.some((call) => call.url.endsWith('/telegram-link'))).toBe(false);
    });

    it('gives the install link of the one that has a Slack app, not a new setup page', async () => {
      const calls = stubBackends({ ...bothApps, appsWithCredentials: ['slack-older'] });

      const { text } = await addChannel('slack');

      expect(text).toContain(SLACK_INSTALL_URL);
      expect(calls.some((call) => call.url.includes('/slack-setup-link'))).toBe(false);
    });

    it('gives one setup page when neither got that far', async () => {
      const calls = stubBackends(bothBots);

      const { text } = await addChannel('telegram');

      expect(text).toContain('/connect#tok_telegram');
      expect(calls.filter((call) => call.url.endsWith('/telegram-link')).map((call) => call.url)).toEqual([
        `${CHANNELS_CALLS}/apps/telegram-atlas/telegram-link`,
      ]);
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

  describe('on WhatsApp', () => {
    const PAGE = 'https://agentinbox.example.test/configure?setup=whatsapp';
    const ON = { enabled: true, available: true, connected: false };

    it('sends the user to the signed-in page to connect a business number', async () => {
      const calls = stubBackends({ whatsAppSetup: ON });

      const result = await callChannelAdd('whatsapp');

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        `WhatsApp needs the user's WhatsApp Business number first. Give them this link to connect it on agentinbox.md, where they sign in as the owner: ${PAGE}\nAfter they finish, call channel_add again.\nShow the link to the user in this chat and nowhere else, never through inbox_send or inbox_reply.`
      );
      expect(calls.find((call) => call.url.includes('/v1/channels/whatsapp'))?.url).toBe(
        `${AGENT_INBOX_API}/v1/channels/whatsapp?agentIdentifier=human-relay`
      );
      expect(calls.some((call) => call.url.includes('/v1/channels/apps'))).toBe(false);
    });

    it('asks for the user’s own number once the business number is connected', async () => {
      stubBackends({ whatsAppSetup: { ...ON, businessConnected: true, displayPhoneNumber: '+1 555 0100' } });

      const { text } = await addChannel('whatsapp');

      expect(text).toContain(
        `WhatsApp Business is connected on +1 555 0100. Give the user this link to connect their own number by sending the agent a code: ${PAGE}`
      );
    });

    it('says it is connected, with both numbers', async () => {
      stubBackends({
        whatsAppSetup: {
          ...ON,
          connected: true,
          businessConnected: true,
          displayPhoneNumber: '+1 555 0100',
          operatorNumberBound: true,
          operatorPhoneNumber: '+44 7700 900123',
        },
      });

      const { text } = await addChannel('whatsapp');

      expect(text).toBe(
        `WhatsApp is connected (on +1 555 0100, the user's number +44 7700 900123). inbox_send can reach the user there with via: "whatsapp".`
      );
    });

    it('says WhatsApp is not available when the account has it off', async () => {
      stubBackends({ whatsAppSetup: { enabled: false, available: false, connected: false } });

      const { text } = await addChannel('whatsapp');

      expect(text).toBe("WhatsApp isn't available for this account yet. Use Telegram or Slack instead.");
    });

    it('says the same when Agent Inbox cannot connect WhatsApp anywhere', async () => {
      stubBackends({ whatsAppSetup: { enabled: true, available: false, connected: false } });

      const { text } = await addChannel('whatsapp');

      expect(text).toContain("WhatsApp isn't available for this account yet.");
    });

    it('reads an older API that keeps the status to the dashboard as not available', async () => {
      stubBackends({ channelFailures: { 'GET /v1/channels/whatsapp': { status: 403, message: 'dashboard_only' } } });

      const { text } = await addChannel('whatsapp');

      expect(text).toContain("WhatsApp isn't available for this account yet.");
    });

    it('passes on other failures', async () => {
      stubBackends({ channelFailures: { 'GET /v1/channels/whatsapp': { status: 500, message: 'Upstream down' } } });

      const result = await callChannelAdd('whatsapp');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Upstream down');
    });

    it('asks for setup first when there is no agent', async () => {
      stubBackends({ agent: null, whatsAppSetup: ON });

      const result = await callChannelAdd('whatsapp');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Agent Inbox is not set up yet.');
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

  it('points at channel_add for WhatsApp too', () => {
    const error = new AgentInboxApiError(
      404,
      'No whatsapp channel is linked to this agent. Connect whatsapp or run `npx @agentinbox/cli channel add whatsapp`.'
    );

    expect(mapSetupHint(error)).toBe(
      'No whatsapp channel is linked to this agent. Call channel_add with channel "whatsapp" to connect it.'
    );
  });

  it('leaves email in the API’s words, since channel_add does not add it', () => {
    const message =
      'No email channel is linked to this agent. Connect email or run `npx @agentinbox/cli channel add email`.';

    expect(mapSetupHint(new AgentInboxApiError(404, message))).toBe(message);
  });
});

describe('inbox_send on WhatsApp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function send(args: Record<string, unknown>) {
    const { env, ctx } = setup();
    const response = await worker.fetch(rpc('tools/call', { name: 'inbox_send', arguments: args }), env, ctx);
    const { result } = (await response.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };

    return result;
  }

  const refused = (body: Record<string, unknown>) => ({ sendError: { status: 422, body } });

  it('sends with via: "whatsapp"', async () => {
    const calls = stubBackends({ createdInteraction: {} });

    const result = await send({ message: 'Build is green', to: 'alice', via: 'whatsapp' });

    expect(result.isError).toBeFalsy();
    const created = calls.find((call) => call.url.endsWith('/v1/inbox/messages') && call.method === 'POST');
    expect(created?.body).toMatchObject({ kind: 'tell', to: ['alice'], via: 'whatsapp' });
  });

  it('names another channel when the window is closed', async () => {
    stubBackends(
      refused({
        code: 'whatsapp_window_closed',
        message: "WhatsApp can't reach alice until they write to you again. Send with --via telegram instead.",
        subscriberId: 'alice',
        windowClosedAt: '2026-11-10T09:00:00.000Z',
        availableChannels: ['telegram', 'email'],
      })
    );

    const result = await send({ message: 'Ping', to: 'alice', via: 'whatsapp' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      `WhatsApp can't reach alice until they write to you again (their window closed at 2026-11-10T09:00:00.000Z). WhatsApp only lets an agent write within 24 hours of the person's last message. Send it again with via: "telegram" (they're also on email).`
    );
  });

  it('points at contact_invite when the person has no other channel', async () => {
    stubBackends(
      refused({
        code: 'whatsapp_window_closed',
        message: 'closed',
        subscriberId: 'alice',
        availableChannels: [],
      })
    );

    const result = await send({ message: 'Ping', to: 'alice' });

    expect(result.content[0].text).toBe(
      `WhatsApp can't reach alice until they write to you again. WhatsApp only lets an agent write within 24 hours of the person's last message. alice has no other channel. Call contact_invite for alice and give the user the link to pass on.`
    );
  });

  it('asks for fewer options when there are too many buttons', async () => {
    stubBackends(
      refused({
        code: 'whatsapp_too_many_buttons',
        message: 'too many',
        subscriberId: 'alice',
        maxButtons: 3,
        buttons: 4,
        availableChannels: ['slack'],
      })
    );

    const result = await send({
      kind: 'choose',
      message: 'Which?',
      to: 'alice',
      via: 'whatsapp',
      options: ['a', 'b', 'c', 'd'],
      wait_seconds: 0,
    });

    expect(result.content[0].text).toBe(
      'WhatsApp shows at most 3 buttons and this has 4. Offer at most 3 options. Or send it as it is with via: "slack".'
    );
  });

  it('keeps the API’s words when the refusal lacks its fields', async () => {
    stubBackends(refused({ code: 'whatsapp_window_closed', message: 'WhatsApp window closed.' }));

    const result = await send({ message: 'Ping', to: 'alice', via: 'whatsapp' });

    expect(result.content[0].text).toBe('WhatsApp window closed.');
  });

  it('lists whatsapp in channel_add and inbox_send', async () => {
    stubBackends();
    const { env, ctx } = setup();

    const list = await worker.fetch(rpc('tools/list', {}), env, ctx);
    const { result } = (await list.json()) as {
      result: { tools: Array<{ name: string; inputSchema: { properties: Record<string, { enum?: string[] }> } }> };
    };
    const schemaOf = (name: string) => result.tools.find((tool) => tool.name === name)?.inputSchema.properties;

    expect(schemaOf('channel_add')?.channel.enum).toContain('whatsapp');
    expect(schemaOf('inbox_send')?.via.enum).toContain('whatsapp');
  });
});
