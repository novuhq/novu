import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  logEmailHandoffEvents,
  logSlackHandoffEvents,
  logSlackSetupLinkHandoffEvent,
  logTelegramBotfatherHandoffEvent,
  logTelegramDeepLinkHandoffEvents,
  logTelegramDeepLinkQrPngHandoffEvent,
  logTelegramSetupLinkHandoffEvent,
  logTelegramSetupLinkQrPngHandoffEvent,
} from './handoff-events';

describe('handoff-events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs email handoff sentinel lines', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logEmailHandoffEvents({
      inboundAddress: 'agent-abc@dev.agentconnect.sh',
      mailtoUrl: 'mailto:agent-abc@dev.agentconnect.sh?subject=Hi',
      sendFromEmail: 'user@example.com',
    });

    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_INBOUND_ADDRESS=agent-abc@dev.agentconnect.sh');
    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_MAILTO=mailto:agent-abc@dev.agentconnect.sh?subject=Hi');
    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_SEND_FROM_EMAIL=user@example.com');
  });

  it('omits send-from line when not provided', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logEmailHandoffEvents({
      inboundAddress: 'agent-abc@dev.agentconnect.sh',
      mailtoUrl: 'mailto:agent-abc@dev.agentconnect.sh',
    });

    expect(log).not.toHaveBeenCalledWith(expect.stringContaining('SEND_FROM_EMAIL'));
  });

  it('logs slack authorize sentinel line', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logSlackHandoffEvents({ authorizeUrl: 'https://slack.com/oauth/v2/authorize?client_id=abc' });

    expect(log).toHaveBeenCalledWith(
      'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.com/oauth/v2/authorize?client_id=abc'
    );
  });

  it('logs slack setup link sentinel lines', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logSlackSetupLinkHandoffEvent({ setupUrl: 'https://dashboard.novu.co/agents/slack/connect/abc123' });

    expect(log).toHaveBeenCalledWith(
      'NOVU_CONNECT_SLACK_SETUP_URL=https://dashboard.novu.co/agents/slack/connect/abc123'
    );
  });

  it('logs telegram botfather sentinel line', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logTelegramBotfatherHandoffEvent({ botfatherUrl: 'https://t.me/botfather' });

    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_TELEGRAM_BOTFATHER_URL=https://t.me/botfather');
  });

  it('logs telegram setup link sentinel lines', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logTelegramSetupLinkHandoffEvent({ setupUrl: 'https://dashboard.novu.co/agents/telegram/connect/abc123' });

    expect(log).toHaveBeenCalledWith(
      'NOVU_CONNECT_TELEGRAM_SETUP_URL=https://dashboard.novu.co/agents/telegram/connect/abc123'
    );
  });

  it('logs telegram setup QR png sentinel line', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logTelegramSetupLinkQrPngHandoffEvent({ setupQrPngPath: '/tmp/novu-connect-qr-abc123.png' });

    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_TELEGRAM_SETUP_QR_PNG=/tmp/novu-connect-qr-abc123.png');
  });

  it('logs telegram deep link and bot username sentinel lines', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logTelegramDeepLinkHandoffEvents({
      deepLinkUrl: 'https://t.me/mybot?start=abc',
      botUsername: 'mybot',
    });

    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_TELEGRAM_DEEPLINK_URL=https://t.me/mybot?start=abc');
    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_TELEGRAM_BOT_USERNAME=mybot');
  });

  it('logs the QR PNG path sentinel line', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logTelegramDeepLinkQrPngHandoffEvent({ deepLinkQrPngPath: '/tmp/novu-connect-qr-abc123.png' });

    expect(log).toHaveBeenCalledWith('NOVU_CONNECT_TELEGRAM_DEEPLINK_QR_PNG=/tmp/novu-connect-qr-abc123.png');
  });
});
