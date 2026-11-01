import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';

const findRelayAgent = vi.fn();
const checkInboxAddress = vi.fn();
const setupRelay = vi.fn();

vi.mock('../../api/agent-inbox', () => ({
  findRelayAgent: (...args: unknown[]) => findRelayAgent(...args),
  checkInboxAddress: (...args: unknown[]) => checkInboxAddress(...args),
  setupRelay: (...args: unknown[]) => setupRelay(...args),
}));

const { resolveNewAgent, setUpAgent, toHandle } = await import('./agent');

const client = {} as Parameters<typeof resolveNewAgent>[0];

/** A terminal: the answers, in turn, and what it was asked and told. */
function terminal(...answers: string[]) {
  const said: string[] = [];
  const prompt = vi.fn(async (_question: string, options?: { initial?: string }) => {
    const answer = answers.shift();

    return answer === undefined || answer === '<enter>' ? (options?.initial ?? '') : answer;
  });

  return {
    said,
    prompt,
    io: {
      isTTY: true,
      write: (text: string) => {
        said.push(text);
      },
      prompt,
      promptSecret: vi.fn(),
      openInBrowser: vi.fn(),
    },
  };
}

const noTerminal = () => ({ ...terminal().io, isTTY: false });

/** What the API answers for an address: `taken` ones with `suggestion`, every other one free. */
function addressesTaken(taken: Record<string, string | undefined>) {
  checkInboxAddress.mockImplementation(async (_client: unknown, handle: string | undefined) => {
    if (!handle) {
      return { handle: '', available: false, domain: 'agentinbox.md' };
    }

    return handle in taken
      ? { handle, available: false, suggestion: taken[handle], domain: 'agentinbox.md' }
      : { handle, available: true, domain: 'agentinbox.md' };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  findRelayAgent.mockResolvedValue(null);
  addressesTaken({});
});

describe('toHandle', () => {
  it('turns a name into the address it reads as', () => {
    expect(toHandle('Atlas Prime')).toBe('atlas-prime');
    expect(toHandle("  Ada's  Bot!  ")).toBe('ada-s-bot');
    expect(toHandle('Zoë')).toBe('zoe');
  });

  it('has nothing to give for a name no address can hold', () => {
    expect(toHandle('Атлас')).toBe('');
  });

  it('stays short enough, without ending on a hyphen', () => {
    const handle = toHandle(`${'a'.repeat(31)} b`);

    expect(handle).toBe('a'.repeat(31));
  });
});

describe('resolveNewAgent', () => {
  it('asks nothing about an agent that exists, whatever was passed: its address is settled', async () => {
    findRelayAgent.mockResolvedValue({ agentId: 'agent_1', name: 'Atlas' });
    const { io, prompt } = terminal();

    await expect(resolveNewAgent(client, 'human-relay', { agentName: 'Orion' }, undefined, io)).resolves.toEqual({});
    expect(findRelayAgent).toHaveBeenCalledWith(client, 'human-relay');
    expect(prompt).not.toHaveBeenCalled();
  });

  it('still sends a passed address for an agent that exists, which finishes one with no inbox', async () => {
    findRelayAgent.mockResolvedValue({ agentId: 'agent_1', name: 'Atlas' });

    await expect(
      resolveNewAgent(client, 'human-relay', { agentHandle: 'Orion' }, undefined, noTerminal())
    ).resolves.toEqual({ inboxHandle: 'orion' });
  });

  it('asks for the name, then offers the address that comes from it', async () => {
    const { io, prompt, said } = terminal('Atlas Prime', '<enter>');

    await expect(resolveNewAgent(client, 'human-relay', {}, 'ada@acme.com', io)).resolves.toEqual({
      agentName: 'Atlas Prime',
      inboxHandle: 'atlas-prime',
    });
    expect(checkInboxAddress).toHaveBeenCalledWith(client, 'atlas-prime', 'ada@acme.com');
    expect(prompt.mock.calls[0][0]).toBe("Your agent's name: ");
    expect(prompt.mock.calls[1][0]).toBe("Your agent's address: ");
    expect(prompt.mock.calls[1][1]).toMatchObject({
      initial: 'atlas-prime',
      suffix: '@agentinbox.md',
      note: { text: '✓ atlas-prime is available', tone: 'success' },
    });
    expect(said.join('')).toContain("An address can't be changed later.");
  });

  it('keeps asking until the agent has a name', async () => {
    const { io, said } = terminal('', 'x'.repeat(61), 'Atlas', '<enter>');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toMatchObject({
      agentName: 'Atlas',
    });
    expect(said.join('')).toContain('Your agent needs a name.');
    expect(said.join('')).toContain('Keep it to 60 characters.');
  });

  it('gives up on a name after a few tries, saying how to pass one', async () => {
    const { io } = terminal('', '', '', '', '');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).rejects.toThrow('pass --agent-name');
  });

  it('offers a free address close to one that is taken, and says why', async () => {
    addressesTaken({ atlas: 'atlas-acme' });
    checkInboxAddress.mockImplementationOnce(async () => ({
      handle: 'atlas',
      available: false,
      suggestion: 'atlas-acme',
      domain: 'agentinbox.md',
    }));
    const { io, prompt, said } = terminal('Atlas', '<enter>');

    await expect(resolveNewAgent(client, 'human-relay', {}, 'ada@acme.com', io)).resolves.toMatchObject({
      inboxHandle: 'atlas-acme',
    });
    expect(prompt.mock.calls[1][1]).toMatchObject({ initial: 'atlas-acme' });
    expect(said.join('')).toContain('atlas is taken, so this one is close to it.');
  });

  it('takes an address the person types instead', async () => {
    const { io } = terminal('Atlas', 'orion');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toMatchObject({
      agentName: 'Atlas',
      inboxHandle: 'orion',
    });
  });

  it('reads what was typed as an address: capitals, spaces, or the whole address', async () => {
    for (const [typed, handle] of [
      ['Acme Bot', 'acme-bot'],
      ['orion@agentinbox.md', 'orion'],
    ]) {
      const { io } = terminal('Atlas', typed);

      await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toMatchObject({
        inboxHandle: handle,
      });
    }
  });

  it('checks the address settled on, and offers another when it is taken', async () => {
    addressesTaken({ orion: 'orion-acme' });
    const { io, prompt, said } = terminal('Atlas', 'orion', '<enter>');

    await expect(resolveNewAgent(client, 'human-relay', {}, 'ada@acme.com', io)).resolves.toMatchObject({
      inboxHandle: 'orion-acme',
    });
    expect(said.join('')).toContain('orion is taken.');
    expect(prompt.mock.calls[2][1]).toMatchObject({ initial: 'orion-acme' });
  });

  it('asks for an address when the name has nothing an address can hold', async () => {
    const { io, prompt, said } = terminal('Атлас', 'atlas');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toEqual({
      agentName: 'Атлас',
      inboxHandle: 'atlas',
    });
    expect(said.join('')).toContain('its name has nothing an address can hold');
    expect(prompt.mock.calls[1][1]).toMatchObject({ initial: '' });
  });

  it('refuses an address that can be none, and asks again', async () => {
    const { io, said } = terminal('Атлас', 'Атлас', 'atlas');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toMatchObject({
      inboxHandle: 'atlas',
    });
    expect(said.join('')).toContain('An address takes letters, digits and hyphens');
  });

  it('says whether what is typed is free as it is typed', async () => {
    addressesTaken({ orion: 'orion-acme', 'taken-too': undefined });
    const { io, prompt } = terminal('Atlas', '<enter>');
    await resolveNewAgent(client, 'human-relay', {}, undefined, io);
    const check = prompt.mock.calls[1][1]?.check;

    await expect(check?.('Free One')).resolves.toEqual({ text: '✓ free-one is available', tone: 'success' });
    await expect(check?.('orion')).resolves.toEqual({ text: 'orion is taken. orion-acme is free', tone: 'accent' });
    await expect(check?.('taken-too')).resolves.toEqual({ text: 'taken-too is taken', tone: 'accent' });
    await expect(check?.('Атлас')).resolves.toEqual({ text: 'a–z and 0–9 only', tone: 'accent' });
  });

  it('shows what is typed as the address it will be, so what is on screen is what gets claimed', async () => {
    const { io, prompt } = terminal('Atlas', '<enter>');
    await resolveNewAgent(client, 'human-relay', {}, undefined, io);
    const display = prompt.mock.calls[1][1]?.display;

    expect(display?.('foo.bar')).toBe('foo-bar');
    expect(display?.('Acme Bot')).toBe('acme-bot');
    expect(display?.('orion@agentinbox.md')).toBe('orion');
    expect(display?.('Zoë')).toBe('zoe');
    expect(display?.('Атлас')).toBe('');
  });

  it('keeps a hyphen at the end of what is typed, or nobody could type past it', async () => {
    const { io, prompt } = terminal('Atlas', '<enter>');
    await resolveNewAgent(client, 'human-relay', {}, undefined, io);
    const display = prompt.mock.calls[1][1]?.display;

    expect(display?.('atlas-')).toBe('atlas-');
    expect(display?.('atlas ')).toBe('atlas-');
  });

  it('leaves the address to the API when it cannot be asked what is free', async () => {
    checkInboxAddress.mockRejectedValue(new Error('network down'));
    const { io, prompt } = terminal('Atlas');

    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, io)).resolves.toEqual({ agentName: 'Atlas' });
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('takes --agent-name and asks for the address only', async () => {
    const { io, prompt } = terminal('<enter>');

    await expect(resolveNewAgent(client, 'human-relay', { agentName: '  Atlas  ' }, undefined, io)).resolves.toEqual({
      agentName: 'Atlas',
      inboxHandle: 'atlas',
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(prompt.mock.calls[0][0]).toBe("Your agent's address: ");
  });

  it('takes --agent-handle without asking, and leaves it to setup to say if it is taken', async () => {
    const { io, prompt } = terminal();

    await expect(
      resolveNewAgent(client, 'human-relay', { agentName: 'Atlas', agentHandle: 'Orion' }, undefined, io)
    ).resolves.toEqual({ agentName: 'Atlas', inboxHandle: 'orion' });
    expect(prompt).not.toHaveBeenCalled();
    expect(checkInboxAddress).not.toHaveBeenCalled();
  });

  it('refuses an --agent-handle that can be no address', async () => {
    await expect(
      resolveNewAgent(
        client,
        'human-relay',
        { agentName: 'Atlas', agentHandle: 'not an address' },
        undefined,
        noTerminal()
      )
    ).rejects.toThrow('An address takes letters, digits and hyphens');
  });

  it('refuses an --agent-name too long for the API', async () => {
    await expect(
      resolveNewAgent(client, 'human-relay', { agentName: 'x'.repeat(61) }, undefined, noTerminal())
    ).rejects.toThrow('up to 60 characters');
  });

  it('needs --agent-name without a terminal, for a new agent only', async () => {
    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, noTerminal())).rejects.toThrow(
      'Pass --agent-name <name>'
    );

    findRelayAgent.mockResolvedValue({ agentId: 'agent_1', name: 'Atlas' });
    await expect(resolveNewAgent(client, 'human-relay', {}, undefined, noTerminal())).resolves.toEqual({});
  });

  it('leaves the address to the API without a terminal', async () => {
    await expect(
      resolveNewAgent(client, 'human-relay', { agentName: 'Atlas' }, undefined, noTerminal())
    ).resolves.toEqual({ agentName: 'Atlas' });
    expect(checkInboxAddress).not.toHaveBeenCalled();
  });
});

describe('setUpAgent', () => {
  const input = { subscriberId: 'ada', operator: true, agentName: 'Atlas', inboxHandle: 'atlas' };

  it('says what is free when the address was taken', async () => {
    setupRelay.mockRejectedValue(
      new ApiError('atlas is taken', 409, 'POST /v1/setup', { code: 'inbox_address_taken', suggestion: 'atlas-acme' })
    );

    await expect(setUpAgent(client, input)).rejects.toThrow(
      'atlas is taken. Pick another with --agent-handle, such as atlas-acme.'
    );
  });

  it('passes on anything else as it is', async () => {
    const failure = new ApiError('Forbidden', 403, 'POST /v1/setup', {});
    setupRelay.mockRejectedValue(failure);

    await expect(setUpAgent(client, input)).rejects.toBe(failure);
  });
});
