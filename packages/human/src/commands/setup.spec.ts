import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HumanApiError } from '../api/client';
import { DEFAULT_API_URL, HUMAN_SETUP_PAGE_ORIGIN } from '../config';
import { SetupStillPendingError } from '../output';

vi.mock('../api/setup', () => ({
  bootstrapKeylessSession: vi.fn(),
  listIntegrations: vi.fn(),
  createTelegramIntegration: vi.fn(),
  createSlackIntegration: vi.fn(),
  listAgentIntegrations: vi.fn(),
  linkAgentIntegration: vi.fn(),
  addAgentEmailIntegration: vi.fn(),
  issueTelegramMobileLink: vi.fn(),
  getTelegramMobileLinkStatus: vi.fn(),
  consumeTelegramMobileLink: vi.fn(),
  issueTelegramSubscriberLink: vi.fn(),
  slackQuickSetup: vi.fn(),
  generateConnectOauthUrl: vi.fn(),
  issueSlackSetupLink: vi.fn(),
  getSlackSetupLinkStatus: vi.fn(),
  hasChannelEndpoint: vi.fn(),
  getSubscriberEmail: vi.fn(),
}));

vi.mock('../qr', () => ({ renderQR: vi.fn((text: string) => `<QR ${text}>`) }));
vi.mock('../cli-io', () => ({ info: vi.fn(), promptLine: vi.fn(), promptSecret: vi.fn() }));

const api = await import('../api/setup');
const { connectSlack, connectTelegram, resolveOperatorName } = await import('./setup');

const mocked = {
  listAgentIntegrations: vi.mocked(api.listAgentIntegrations),
  listIntegrations: vi.mocked(api.listIntegrations),
  hasChannelEndpoint: vi.mocked(api.hasChannelEndpoint),
  issueTelegramSubscriberLink: vi.mocked(api.issueTelegramSubscriberLink),
  issueTelegramMobileLink: vi.mocked(api.issueTelegramMobileLink),
  getTelegramMobileLinkStatus: vi.mocked(api.getTelegramMobileLinkStatus),
  consumeTelegramMobileLink: vi.mocked(api.consumeTelegramMobileLink),
  generateConnectOauthUrl: vi.mocked(api.generateConnectOauthUrl),
  slackQuickSetup: vi.mocked(api.slackQuickSetup),
  issueSlackSetupLink: vi.mocked(api.issueSlackSetupLink),
  getSlackSetupLinkStatus: vi.mocked(api.getSlackSetupLinkStatus),
};

const missingBotToken = new HumanApiError('Telegram bot token is missing', 422, 'POST /link', {});
const deepLink = { deepLinkUrl: 'https://t.me/my_relay_bot?start=abc', botUsername: 'my_relay_bot' };
const mobileLink = {
  token: 'tok_abc',
  url: 'http://localhost:4201/agents/telegram/connect/tok_abc',
  expiresAt: new Date().toISOString(),
};

/** `prompt` and `promptSecret` share one answer queue, so tests list answers in prompt order. */
function makeIo(isTTY: boolean, answers: readonly string[] = []) {
  const chunks: string[] = [];
  const queue = [...answers];
  const nextAnswer = async () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error('unexpected prompt');
    }

    return next;
  };
  const prompt = vi.fn(nextAnswer);
  const promptSecret = vi.fn(nextAnswer);

  return {
    io: {
      isTTY,
      write: (text: string) => {
        chunks.push(text);
      },
      openInBrowser: vi.fn(),
      prompt,
      promptSecret,
    },
    prompt,
    promptSecret,
    output: () => chunks.join(''),
  };
}

function makeClient(apiUrl = DEFAULT_API_URL) {
  return { apiUrl, axios: {}, isKeyless: true } as never;
}

describe('connectTelegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.listAgentIntegrations.mockResolvedValue([{ integration: { identifier: 'tg', providerId: 'telegram' } }]);
    mocked.issueTelegramMobileLink.mockResolvedValue(mobileLink);
    mocked.consumeTelegramMobileLink.mockResolvedValue({ success: true, botUsername: 'my_relay_bot' });
  });

  it('short-circuits when the channel endpoint already exists', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(true);
    const { io, output } = makeIo(true);

    await expect(connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io)).resolves.toBe('tg');

    expect(mocked.issueTelegramSubscriberLink).not.toHaveBeenCalled();
    expect(mocked.issueTelegramMobileLink).not.toHaveBeenCalled();
    expect(output()).toBe('');
  });

  it('resumes at the /start step when the bot token is already saved', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockResolvedValue(deepLink);
    const { io, output } = makeIo(true);

    await connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io);

    expect(mocked.issueTelegramMobileLink).not.toHaveBeenCalled();
    expect(mocked.getTelegramMobileLinkStatus).not.toHaveBeenCalled();
    expect(io.openInBrowser).not.toHaveBeenCalled();
    expect(output()).toContain(deepLink.deepLinkUrl);
    expect(output()).toContain(`<QR ${deepLink.deepLinkUrl}>`);
  });

  it('hands off to the human.md landing page when no bot token is saved yet (TTY)', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockRejectedValueOnce(missingBotToken).mockResolvedValue(deepLink);
    mocked.getTelegramMobileLinkStatus.mockResolvedValue({ valid: false, reason: 'used' });
    const { io, output } = makeIo(true, ['2']);

    await expect(connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io)).resolves.toBe('tg');

    const setupUrl = `${HUMAN_SETUP_PAGE_ORIGIN}/connect#${mobileLink.token}`;
    expect(mocked.issueTelegramMobileLink).toHaveBeenCalledWith(expect.anything(), 'tg', 'sub_1');
    expect(io.openInBrowser).toHaveBeenCalledWith(setupUrl);
    expect(output()).toContain(setupUrl);
    expect(output()).toContain(`<QR ${setupUrl}>`);
    // The bot token never passes through the terminal.
    expect(mocked.consumeTelegramMobileLink).not.toHaveBeenCalled();
    // After the page saves the token we continue to the /start deep link.
    expect(mocked.issueTelegramSubscriberLink).toHaveBeenCalledTimes(2);
    expect(output()).toContain(deepLink.deepLinkUrl);
  });

  it('prints only the URL and never opens a browser or draws a QR without a TTY', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockRejectedValueOnce(missingBotToken).mockResolvedValue(deepLink);
    mocked.getTelegramMobileLinkStatus.mockResolvedValue({ valid: false, reason: 'used' });
    const { io, output } = makeIo(false);

    await connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io);

    expect(io.openInBrowser).not.toHaveBeenCalled();
    expect(output()).toContain(`${HUMAN_SETUP_PAGE_ORIGIN}/connect#${mobileLink.token}`);
    expect(output()).not.toContain('<QR');
  });

  it('uses the server-minted dashboard URL for self-hosted APIs', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockRejectedValueOnce(missingBotToken).mockResolvedValue(deepLink);
    mocked.getTelegramMobileLinkStatus.mockResolvedValue({ valid: false, reason: 'used' });
    const { io, output } = makeIo(true, ['page']);

    await connectTelegram(makeClient('http://localhost:3000'), 'human-relay', 'sub_1', {}, io);

    expect(output()).toContain(mobileLink.url);
    expect(output()).not.toContain(HUMAN_SETUP_PAGE_ORIGIN);
    expect(io.openInBrowser).toHaveBeenCalledWith(mobileLink.url);
  });

  it('saves a bot token pasted in the terminal when that is the chosen path', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockRejectedValueOnce(missingBotToken).mockResolvedValue(deepLink);
    const { io, output, prompt, promptSecret } = makeIo(true, ['1', 'not-a-token', '123456:ABC-def']);

    await expect(connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io)).resolves.toBe('tg');

    expect(prompt).toHaveBeenCalledWith('Choice [1-2]: ');
    expect(prompt).not.toHaveBeenCalledWith('Telegram bot token: ');
    // The token is a credential — it must go through the non-echoing prompt.
    expect(promptSecret).toHaveBeenCalledWith('Telegram bot token: ');
    expect(mocked.consumeTelegramMobileLink).toHaveBeenCalledWith(expect.anything(), {
      token: mobileLink.token,
      botToken: '123456:ABC-def',
    });
    expect(mocked.getTelegramMobileLinkStatus).not.toHaveBeenCalled();
    expect(io.openInBrowser).not.toHaveBeenCalled();
    expect(output()).toContain('Paste the bot token here');
    expect(output()).toContain('https://t.me/botfather');
    expect(output()).toContain('does not look like a bot token');
    expect(output()).not.toContain('/connect#');
    expect(output()).toContain(deepLink.deepLinkUrl);
  });

  it('saves a --telegram-bot-token directly without asking how to connect', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.issueTelegramSubscriberLink.mockResolvedValue(deepLink);
    const { io, output, prompt } = makeIo(true);

    await connectTelegram(makeClient(), 'human-relay', 'sub_1', { telegramBotToken: ' 123:abc ' }, io);

    expect(prompt).not.toHaveBeenCalled();

    expect(mocked.consumeTelegramMobileLink).toHaveBeenCalledWith(expect.anything(), {
      token: mobileLink.token,
      botToken: '123:abc',
    });
    expect(mocked.getTelegramMobileLinkStatus).not.toHaveBeenCalled();
    expect(output()).not.toContain('/connect#');
  });

  it('exits as "still pending" when the setup link expires before the bot is connected', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(false);
    mocked.issueTelegramSubscriberLink.mockRejectedValue(missingBotToken);
    mocked.getTelegramMobileLinkStatus.mockResolvedValue({ valid: false, reason: 'expired' });
    const { io } = makeIo(false);

    await expect(connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io)).rejects.toBeInstanceOf(
      SetupStillPendingError
    );
  });

  it('rethrows unrelated failures from the deep-link probe', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(false);
    mocked.issueTelegramSubscriberLink.mockRejectedValue(new HumanApiError('boom', 500, 'POST /link', {}));
    const { io } = makeIo(false);

    await expect(connectTelegram(makeClient(), 'human-relay', 'sub_1', {}, io)).rejects.toThrow('boom');
    expect(mocked.issueTelegramMobileLink).not.toHaveBeenCalled();
  });
});

const slackIntegration = {
  _id: 'int_slack',
  identifier: 'sl',
  providerId: 'slack',
  channel: 'chat',
};
const missingSlackCredentials = new HumanApiError('Slack integration is missing credentials', 404, 'POST /oauth', {});
const authorizeUrl = 'https://slack.com/oauth/v2/authorize?state=abc';
const slackSetupLink = {
  token: 'sl_tok',
  url: 'http://localhost:4201/agents/slack/connect/sl_tok',
  expiresAt: new Date().toISOString(),
};

describe('connectSlack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.listAgentIntegrations.mockResolvedValue([{ integration: { identifier: 'sl', providerId: 'slack' } }]);
    mocked.listIntegrations.mockResolvedValue([slackIntegration]);
    mocked.issueSlackSetupLink.mockResolvedValue(slackSetupLink);
  });

  it('short-circuits when the channel endpoint already exists', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(true);
    const { io } = makeIo(true);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).resolves.toBe('sl');

    expect(mocked.generateConnectOauthUrl).not.toHaveBeenCalled();
    expect(mocked.issueSlackSetupLink).not.toHaveBeenCalled();
  });

  it('opens the install page and prints the authorize URL as a fallback when the Slack app already exists', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockResolvedValue(authorizeUrl);
    const { io, output } = makeIo(true);

    await connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io);

    expect(mocked.issueSlackSetupLink).not.toHaveBeenCalled();
    expect(io.openInBrowser).toHaveBeenCalledWith(authorizeUrl);
    // The browser opener is best-effort (SSH, headless), so the link is always printed — but never as a QR.
    expect(output()).toContain(authorizeUrl);
    expect(output()).not.toContain(`<QR ${authorizeUrl}>`);
  });

  it('creates the app from a token pasted in the terminal', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockRejectedValueOnce(missingSlackCredentials).mockResolvedValue(authorizeUrl);
    const { io, output, prompt, promptSecret } = makeIo(true, ['paste', 'xoxb-nope', 'xoxe.xoxp-pasted']);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).resolves.toBe('sl');

    expect(prompt).not.toHaveBeenCalledWith('Slack App Configuration Token: ');
    expect(promptSecret).toHaveBeenCalledWith('Slack App Configuration Token: ');
    expect(mocked.slackQuickSetup).toHaveBeenCalledWith(expect.anything(), 'int_slack', {
      configToken: 'xoxe.xoxp-pasted',
      agentId: 'agent_1',
    });
    expect(mocked.issueSlackSetupLink).not.toHaveBeenCalled();
    expect(output()).toContain('Paste an App Configuration Token here');
    expect(output()).toContain('That looks like a bot token');
    expect(output()).toContain(authorizeUrl);
    expect(output()).not.toContain('channel=slack');
    expect(io.openInBrowser).toHaveBeenCalledTimes(1);
    expect(io.openInBrowser).toHaveBeenCalledWith(authorizeUrl);
  });

  it('re-prompts when Slack rejects the pasted token (400 — no app was created)', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockRejectedValueOnce(missingSlackCredentials).mockResolvedValue(authorizeUrl);
    mocked.slackQuickSetup
      .mockRejectedValueOnce(new HumanApiError('Slack app creation failed: invalid_token.', 400, 'POST /q', {}))
      .mockResolvedValueOnce(undefined);
    const { io, output, promptSecret } = makeIo(true, ['1', 'xoxe.xoxp-expired', 'xoxe.xoxp-fresh']);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).resolves.toBe('sl');

    expect(promptSecret).toHaveBeenCalledTimes(2);
    expect(mocked.slackQuickSetup).toHaveBeenCalledTimes(2);
    expect(output()).toContain('invalid_token');
  });

  it('stops after a 409 instead of re-prompting — the app already exists on Slack', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(false);
    mocked.generateConnectOauthUrl.mockRejectedValue(missingSlackCredentials);
    mocked.slackQuickSetup.mockRejectedValueOnce(
      new HumanApiError('Integration is already linked to a different agent', 409, 'POST /q', {})
    );
    const { io, promptSecret } = makeIo(true, ['1', 'xoxe.xoxp-token', 'xoxe.xoxp-should-not-be-asked']);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).rejects.toThrow(
      'already linked to a different agent'
    );

    // A second paste would create a second Slack app the human then has to delete.
    expect(promptSecret).toHaveBeenCalledTimes(1);
    expect(mocked.slackQuickSetup).toHaveBeenCalledTimes(1);
  });

  it('creates the app from --slack-config-token without the landing page', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockRejectedValueOnce(missingSlackCredentials).mockResolvedValue(authorizeUrl);
    const { io, output } = makeIo(false);

    await connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', { slackConfigToken: ' xoxe.xoxp-token ' }, io);

    expect(mocked.slackQuickSetup).toHaveBeenCalledWith(expect.anything(), 'int_slack', {
      configToken: 'xoxe.xoxp-token',
      agentId: 'agent_1',
    });
    expect(mocked.issueSlackSetupLink).not.toHaveBeenCalled();
    expect(output()).toContain(authorizeUrl);
    expect(output()).not.toContain('channel=slack');
  });

  it('hands off to the human.md landing page when the app does not exist yet (TTY)', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockRejectedValueOnce(missingSlackCredentials).mockResolvedValue(authorizeUrl);
    mocked.getSlackSetupLinkStatus.mockResolvedValue({ valid: false, reason: 'used' });
    const { io, output } = makeIo(true, ['2']);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).resolves.toBe('sl');

    const setupUrl = `${HUMAN_SETUP_PAGE_ORIGIN}/connect?channel=slack#${slackSetupLink.token}`;
    expect(mocked.issueSlackSetupLink).toHaveBeenCalledWith(expect.anything(), 'human-relay', 'int_slack', 'sub_1');
    expect(io.openInBrowser).toHaveBeenCalledTimes(2);
    expect(io.openInBrowser).toHaveBeenNthCalledWith(1, setupUrl);
    expect(io.openInBrowser).toHaveBeenNthCalledWith(2, authorizeUrl);
    expect(output()).toContain(setupUrl);
    expect(output()).toContain(`<QR ${setupUrl}>`);
    // The config token never passes through the terminal; the OAuth URL is printed but too long for a QR.
    expect(mocked.slackQuickSetup).not.toHaveBeenCalled();
    expect(output()).toContain(authorizeUrl);
    expect(output()).not.toContain(`<QR ${authorizeUrl}>`);
  });

  it('prints only the URLs and never opens a browser or draws a QR without a TTY', async () => {
    mocked.hasChannelEndpoint.mockResolvedValueOnce(false).mockResolvedValue(true);
    mocked.generateConnectOauthUrl.mockRejectedValueOnce(missingSlackCredentials).mockResolvedValue(authorizeUrl);
    mocked.getSlackSetupLinkStatus.mockResolvedValue({ valid: false, reason: 'used' });
    const { io, output } = makeIo(false);

    await connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io);

    expect(io.openInBrowser).not.toHaveBeenCalled();
    expect(output()).toContain(`${HUMAN_SETUP_PAGE_ORIGIN}/connect?channel=slack#${slackSetupLink.token}`);
    expect(output()).toContain(authorizeUrl);
    expect(output()).not.toContain('<QR');
  });

  it('exits as "still pending" when the setup page is never completed', async () => {
    vi.useFakeTimers();
    mocked.hasChannelEndpoint.mockResolvedValue(false);
    mocked.generateConnectOauthUrl.mockRejectedValue(missingSlackCredentials);
    mocked.getSlackSetupLinkStatus.mockResolvedValue({ valid: true });
    const { io, output } = makeIo(false);

    const pending = connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io);
    const assertion = expect(pending).rejects.toBeInstanceOf(SetupStillPendingError);
    await vi.advanceTimersByTimeAsync(31 * 60_000);

    await assertion;
    expect(output()).toContain(`${HUMAN_SETUP_PAGE_ORIGIN}/connect?channel=slack#${slackSetupLink.token}`);
    expect(output()).not.toContain('<QR');
    vi.useRealTimers();
  });

  it('fails when the setup link is no longer valid', async () => {
    mocked.hasChannelEndpoint.mockResolvedValue(false);
    mocked.generateConnectOauthUrl.mockRejectedValue(missingSlackCredentials);
    mocked.getSlackSetupLinkStatus.mockResolvedValue({ valid: false, reason: 'invalid' });
    const { io } = makeIo(false);

    await expect(connectSlack(makeClient(), 'agent_1', 'human-relay', 'sub_1', {}, io)).rejects.toThrow(
      'no longer valid'
    );
  });
});

describe('resolveOperatorName', () => {
  it('uses --name without prompting', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({ name: 'Dima Grossman' }, false, { isTTY: true, prompt })).resolves.toEqual({
      firstName: 'Dima',
      lastName: 'Grossman',
    });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('prompts once on a first-run TTY and accepts an empty answer', async () => {
    const prompt = vi.fn().mockResolvedValue('Alice');
    await expect(resolveOperatorName({}, false, { isTTY: true, prompt })).resolves.toEqual({ firstName: 'Alice' });
    expect(prompt).toHaveBeenCalledTimes(1);

    const empty = vi.fn().mockResolvedValue('   ');
    await expect(resolveOperatorName({}, false, { isTTY: true, prompt: empty })).resolves.toBeUndefined();
  });

  it('never prompts when already set up or when stdin is not a TTY', async () => {
    const prompt = vi.fn();

    await expect(resolveOperatorName({}, true, { isTTY: true, prompt })).resolves.toBeUndefined();
    await expect(resolveOperatorName({}, false, { isTTY: false, prompt })).resolves.toBeUndefined();
    expect(prompt).not.toHaveBeenCalled();
  });
});
