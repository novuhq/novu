import { afterEach, describe, expect, it, vi } from 'vitest';
import { logEmailHandoffEvents, logSlackHandoffEvents } from './handoff-events';

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
});
