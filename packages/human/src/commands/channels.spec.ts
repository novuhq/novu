import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contact } from '../api/human';
import type { HumanCliConfig } from '../config';

const listContacts = vi.fn();
const clientFromConfig = vi.fn();
const loadConfig = vi.fn();

vi.mock('../api/human', () => ({
  listContacts: (...args: unknown[]) => listContacts(...args),
}));

vi.mock('../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config')>()),
  loadConfig: () => loadConfig(),
}));

vi.mock('./interact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./interact')>()),
  clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
}));

vi.mock('./setup', () => ({ setupCommand: vi.fn() }));

const { channelListCommand, renderChannels, toChannelRows } = await import('./channels');

const config: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'human_me',
};

function operator(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'human_me',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    channels: [
      { via: 'telegram', connectedAt: '2026-09-02T00:00:00.000Z', isDefault: true },
      { via: 'email', isDefault: false },
    ],
    defaultVia: 'telegram',
    ...overrides,
  };
}

describe('toChannelRows', () => {
  it("marks the account's default when this computer saved none", () => {
    expect(toChannelRows(operator(), undefined)).toEqual([
      { channel: 'telegram', connectedAt: '2026-09-02T00:00:00.000Z', isDefault: true },
      { channel: 'email', isDefault: false },
    ]);
  });

  it('lets the default saved on this computer win when it is connected', () => {
    expect(toChannelRows(operator(), 'email').map((row) => [row.channel, row.isDefault])).toEqual([
      ['telegram', false],
      ['email', true],
    ]);
  });

  it("falls back to the account's default when the saved one is not connected", () => {
    expect(toChannelRows(operator(), 'slack').find((row) => row.isDefault)?.channel).toBe('telegram');
  });

  it('lists nothing for an operator without channels', () => {
    expect(toChannelRows(undefined, 'telegram')).toEqual([]);
  });
});

describe('renderChannels', () => {
  it('lists every channel and marks the default', () => {
    const out = renderChannels(toChannelRows(operator(), undefined), undefined);

    expect(out).toMatch(/telegram\s+\(default\)/);
    expect(out).toMatch(/^email\s*$/m);
  });

  it('warns when the saved default is not connected', () => {
    expect(renderChannels(toChannelRows(operator(), 'slack'), 'slack')).toContain('human channel add slack');
  });

  it('points to `human channel add` when nothing is connected', () => {
    expect(renderChannels([], undefined)).toContain('No channels connected yet');
  });
});

describe('channelListCommand', () => {
  let stdout: string;

  beforeEach(() => {
    stdout = '';
    listContacts.mockReset();
    loadConfig.mockReturnValue({ ...config, defaultChannel: 'email' });
    clientFromConfig.mockReturnValue({ client: {}, config });
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);

      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);
  });

  it("asks for the operator's own contact and prints the channels as JSON", async () => {
    listContacts.mockResolvedValue({ data: [operator()], next: null });

    await expect(channelListCommand({ json: true })).rejects.toThrow('exit:0');

    expect(listContacts).toHaveBeenCalledWith(
      {},
      { subscriberId: 'human_me', limit: 1, agentIdentifier: 'human-relay' }
    );
    expect(JSON.parse(stdout)).toEqual({
      data: [
        { channel: 'telegram', connectedAt: '2026-09-02T00:00:00.000Z', isDefault: false },
        { channel: 'email', isDefault: true },
      ],
      defaultChannel: 'email',
    });
  });

  it('prints the list by default', async () => {
    listContacts.mockResolvedValue({ data: [operator()], next: null });

    await expect(channelListCommand({})).rejects.toThrow('exit:0');

    expect(stdout).toMatch(/email\s+\(default\)/);
    expect(stdout).toContain('telegram');
  });
});
