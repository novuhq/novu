import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { SetupStillPendingError } from '../../output';

const getWhatsAppSetup = vi.fn();
const waitForWhatsAppSetup = vi.fn();

vi.mock('../../api/setup', () => ({
  getWhatsAppSetup: (...args: unknown[]) => getWhatsAppSetup(...args),
}));

vi.mock('../link-channel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../link-channel')>()),
  waitForWhatsAppSetup: (...args: unknown[]) => waitForWhatsAppSetup(...args),
}));

const { connectWhatsApp } = await import('./whatsapp');

const client = { apiUrl: 'https://www.agentinbox.md/api', isKeyless: false } as Parameters<typeof connectWhatsApp>[0];

function terminal() {
  const said: string[] = [];

  return {
    said,
    io: {
      isTTY: false,
      write: (text: string) => {
        said.push(text);
      },
      prompt: vi.fn(),
      promptSecret: vi.fn(),
      openInBrowser: vi.fn(),
    },
  };
}

const NOT_CONNECTED = { enabled: true, available: true, connected: false, businessConnected: false };

describe('connectWhatsApp', () => {
  beforeEach(() => {
    getWhatsAppSetup.mockReset();
    waitForWhatsAppSetup.mockReset();
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('sends the operator to the WhatsApp drawer on agentinbox.md, and waits until both numbers are connected', async () => {
    getWhatsAppSetup.mockResolvedValue(NOT_CONNECTED);
    waitForWhatsAppSetup.mockResolvedValue('saved');
    const { io, said } = terminal();

    await connectWhatsApp(client, 'human-relay', io);

    expect(said.join('')).toContain('https://www.agentinbox.md/configure?setup=whatsapp');
    expect(said.join('')).toContain('Connect your WhatsApp Business number');
    expect(waitForWhatsAppSetup).toHaveBeenCalledWith(client, 'human-relay');
  });

  it('only asks for the operator’s own number once the business number is in', async () => {
    getWhatsAppSetup.mockResolvedValue({ ...NOT_CONNECTED, businessConnected: true });
    waitForWhatsAppSetup.mockResolvedValue('saved');
    const { io, said } = terminal();

    await connectWhatsApp(client, 'human-relay', io);

    expect(said.join('')).toContain('now send the code from your own WhatsApp');
  });

  it('does nothing more when WhatsApp is connected already', async () => {
    getWhatsAppSetup.mockResolvedValue({
      enabled: true,
      available: true,
      connected: true,
      displayPhoneNumber: '+1 555-010-0199',
      operatorPhoneNumber: '+15550100201',
    });
    const { io, said } = terminal();

    await connectWhatsApp(client, 'human-relay', io);

    expect(said).toEqual([]);
    expect(waitForWhatsAppSetup).not.toHaveBeenCalled();
  });

  it('says WhatsApp isn’t available where the account can’t connect it', async () => {
    getWhatsAppSetup.mockResolvedValue({ enabled: false, available: false, connected: false });

    await expect(connectWhatsApp(client, 'human-relay', terminal().io)).rejects.toThrow(
      "WhatsApp isn't available for this agent yet."
    );
  });

  it('says the same against an API that keeps WhatsApp setup to the dashboard', async () => {
    getWhatsAppSetup.mockRejectedValue(new ApiError('dashboard only', 403, 'GET /v1/channels/whatsapp', {}));

    await expect(connectWhatsApp(client, 'human-relay', terminal().io)).rejects.toThrow(
      "WhatsApp isn't available for this agent yet."
    );
  });

  it('asks a keyless demo to log in first, as connecting signs in on agentinbox.md', async () => {
    await expect(
      connectWhatsApp({ ...client, isKeyless: true } as typeof client, 'human-relay', terminal().io)
    ).rejects.toThrow('Run `npx @agentinbox/cli login` first');
    expect(getWhatsAppSetup).not.toHaveBeenCalled();
  });

  it('stays pending when the operator doesn’t finish in time', async () => {
    getWhatsAppSetup.mockResolvedValue(NOT_CONNECTED);
    waitForWhatsAppSetup.mockResolvedValue('timeout');

    await expect(connectWhatsApp(client, 'human-relay', terminal().io)).rejects.toBeInstanceOf(SetupStillPendingError);
  });
});
