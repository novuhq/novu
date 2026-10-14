import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Interaction } from '../api/agent-inbox';
import type { Conversation, InboxPage } from '../api/inbox';
import type { CliConfig } from '../config';

const listInbox = vi.fn();
const getConversation = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/inbox', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/inbox')>();

  return {
    ...original,
    listInbox: (...args: unknown[]) => listInbox(...args),
    getConversation: (...args: unknown[]) => getConversation(...args),
  };
});

vi.mock('./interact', async (importOriginal) => {
  const original = await importOriginal<typeof import('./interact')>();

  return {
    ...original,
    clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
  };
});

const { inboxListCommand, inboxShowCommand, parseListFilters, parseWait, waitForConversations } = await import(
  './inbox'
);
const { formatConversationReport, keepConversations, resolveAddress } = await import('./interact');
const { formatConversationLine, formatConversationView, formatRelativeTime, stripTerminalControls } = await import(
  '../output'
);

const config: CliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'me',
};

const NOW = Date.parse('2026-10-09T12:00:00.000Z');

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv_1',
    channel: 'telegram',
    kind: 'contact',
    people: [{ id: 'ada', name: 'Ada', kind: 'contact' }],
    status: 'open',
    unreadCount: 2,
    lastMessage: { text: 'is the deploy done?', at: '2026-10-09T11:57:00.000Z', from: 'human' },
    isDirectMessage: true,
    lastActivityAt: '2026-10-09T11:57:00.000Z',
    ...overrides,
  };
}

function page(data: Conversation[], next: string | null = null): InboxPage {
  return { data, next };
}

describe('parseWait', () => {
  it('distinguishes no wait, wait forever and a bounded wait', () => {
    expect(parseWait({})).toBeUndefined();
    expect(parseWait({ wait: true })).toBe(Infinity);
    expect(parseWait({ wait: true, timeout: '90s' })).toBe(90);
    expect(parseWait({ wait: true, timeout: '2m' })).toBe(120);
  });
});

describe('parseListFilters', () => {
  it('sends only the filters that were passed, so the server defaults apply', () => {
    expect(parseListFilters({})).toEqual({});
    expect(parseListFilters({ filter: 'Unread', status: 'all', senders: 'all' })).toEqual({
      filter: 'unread',
      status: 'all',
      senders: 'all',
    });
  });
});

describe('resolveAddress', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('starts a new conversation with you when nobody is named', () => {
    expect(resolveAddress(config, {})).toEqual({ to: 'me' });
  });

  it('starts a new conversation with the named contacts', () => {
    expect(resolveAddress(config, { to: 'ada, bob' })).toEqual({ to: ['ada', 'bob'] });
  });

  it('opens a question in a conversation to anyone with --anyone', () => {
    expect(resolveAddress(config, { anyone: true }, 'conv_1')).toEqual({
      thread: 'conv_1',
      anyoneMayAnswer: true,
    });
  });

  it('replies without naming anyone, ignoring the default recipient', () => {
    vi.stubEnv('INBOX_TO', 'someone');

    expect(resolveAddress(config, {}, ' conv_1 ')).toEqual({ thread: 'conv_1' });
  });

  it('limits who may answer in a reply with --to', () => {
    expect(resolveAddress(config, { to: 'ada' }, 'conv_1')).toEqual({ thread: 'conv_1', to: ['ada'] });
  });

  it('refuses --anyone on a new conversation and --via on a reply', () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);

    expect(() => resolveAddress(config, { anyone: true })).toThrow('exit:1');
    expect(() => resolveAddress(config, { via: 'slack' }, 'conv_1')).toThrow('exit:1');
    vi.restoreAllMocks();
  });
});

describe('formatConversationReport', () => {
  it('names the conversation a send landed in', () => {
    expect(formatConversationReport({ threads: [{ id: 'conv_1', unreadBefore: 0 }] }, false)).toEqual([
      'conversation: conv_1',
    ]);
    expect(formatConversationReport({}, false)).toEqual([]);
  });

  it('warns when a send to a contact landed in a conversation with unread messages', () => {
    const lines = formatConversationReport({ threads: [{ id: 'conv_1', unreadBefore: 2 }] }, false);

    expect(lines[1]).toContain('this conversation had 2 unread messages');
    expect(lines[1]).toContain('npx @agentinbox/cli inbox show conv_1');
  });

  it('keeps the conversations of the create response on a later read of the interaction', () => {
    const read = { id: 'hi_1', status: 'answered' } as Interaction;

    expect(keepConversations(read, { threads: [{ id: 'conv_1', unreadBefore: 0 }] })).toEqual({
      ...read,
      threads: [{ id: 'conv_1', unreadBefore: 0 }],
    });
    expect(keepConversations(read, {})).toBe(read);
  });

  it('does not warn when the host replied in the conversation itself', () => {
    expect(formatConversationReport({ threads: [{ id: 'conv_1', unreadBefore: 2 }] }, true)).toEqual([
      'conversation: conv_1',
    ]);
  });
});

describe('waitForConversations', () => {
  beforeEach(() => {
    listInbox.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-issues capped server waits until a conversation arrives', async () => {
    listInbox.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([conversation()]));

    const result = await waitForConversations({} as never, { filter: 'unread' }, Infinity);

    expect(result.data).toHaveLength(1);
    expect(listInbox).toHaveBeenCalledTimes(2);
    expect(listInbox).toHaveBeenNthCalledWith(1, {}, { filter: 'unread', wait: 25 });
  });

  it('follows the cursor of an empty page before waiting again', async () => {
    listInbox.mockResolvedValueOnce(page([], 'conv_9')).mockResolvedValueOnce(page([conversation()]));

    const result = await waitForConversations({} as never, { filter: 'read' }, Infinity);

    expect(result.data).toHaveLength(1);
    expect(listInbox).toHaveBeenNthCalledWith(2, {}, { filter: 'read', after: 'conv_9', wait: 0 });
  });

  it('stops at the deadline and asks only for the remaining time', async () => {
    let now = NOW;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    listInbox.mockImplementation(async (_client: unknown, query: { wait: number }) => {
      now += query.wait * 1000;

      return page([]);
    });

    const result = await waitForConversations({} as never, {}, 30);

    expect(result.data).toEqual([]);
    expect(listInbox.mock.calls.map(([, query]) => query.wait)).toEqual([25, 5]);
  });
});

describe('formatters', () => {
  it('formats relative times', () => {
    expect(formatRelativeTime('2026-10-09T11:59:30.000Z', NOW)).toBe('30s ago');
    expect(formatRelativeTime('2026-10-09T11:57:00.000Z', NOW)).toBe('3m ago');
    expect(formatRelativeTime('2026-10-09T09:00:00.000Z', NOW)).toBe('3h ago');
    expect(formatRelativeTime('2026-10-07T12:00:00.000Z', NOW)).toBe('2d ago');
  });

  it('renders the channel, people, unread count and preview on one line', () => {
    const line = formatConversationLine(conversation(), NOW);

    expect(line).toContain('conv_1');
    expect(line).toContain('telegram');
    expect(line).toContain('Ada');
    expect(line).toContain('2 unread');
    expect(line).toContain('"is the deploy done?"');
    expect(line).toContain('3m ago');
  });

  it('marks agent-authored previews and resolved conversations', () => {
    const line = formatConversationLine(
      conversation({
        status: 'resolved',
        unreadCount: 0,
        lastMessage: { text: 'done', at: '2026-10-09T11:57:00.000Z', from: 'agent' },
      }),
      NOW
    );

    expect(line).toContain('you: "done"');
    expect(line).toContain('(resolved)');
    expect(line).not.toContain('unread');
  });

  it('marks strangers in the list and in the conversation view', () => {
    const stranger = conversation({ kind: 'stranger', people: [{ id: 'telegram:888', kind: 'stranger' }] });
    const view = formatConversationView({
      conversation: stranger,
      hasMore: false,
      messages: [
        {
          id: 'act_1',
          from: 'human',
          senderKind: 'stranger',
          senderName: 'Eve',
          text: 'hi',
          at: '2026-10-09T11:50:00.000Z',
        },
      ],
    });

    expect(formatConversationLine(stranger, NOW)).toContain('telegram:888 (stranger)');
    expect(view).toContain('Eve (stranger)');
  });

  it('strips terminal control sequences from contact-authored text', () => {
    expect(stripTerminalControls('\u001b[2J\u001b[Hhi\u001b]0;title\u0007 there\u0008\r')).toBe('hi there');
    expect(stripTerminalControls('line one\n\tline two')).toBe('line one\n\tline two');

    const view = formatConversationView({
      conversation: conversation({ people: [{ id: 'ada', name: 'Ada\u001b[31m', kind: 'contact' }] }),
      hasMore: false,
      messages: [
        {
          id: 'act_1',
          from: 'human',
          senderName: '\u001b[2JAda',
          text: '\u001b[2J\u001b[Hfake history',
          attachments: [{ name: 'x\u001b[1Ay.png' }],
          at: '2026-10-09T11:50:00.000Z',
        },
      ],
    });
    const line = formatConversationLine(
      conversation({ lastMessage: { text: '\u001b[2Jhello', at: '2026-10-09T11:57:00.000Z', from: 'human' } }),
      NOW
    );

    expect(view).not.toContain('\u001b[2J');
    expect(view).not.toContain('\u001b[1A');
    expect(view).toContain('fake history');
    expect(view).toContain('xy.png');
    expect(line).not.toContain('\u001b[2J');
    expect(line).toContain('"hello"');
  });

  it('renders a conversation view with interactions and an older-messages hint', () => {
    const out = formatConversationView({
      conversation: conversation(),
      hasMore: true,
      messages: [
        { id: 'act_1', from: 'human', senderName: 'Ada', text: 'ship it?', at: '2026-10-09T11:50:00.000Z' },
        {
          id: 'act_2',
          from: 'agent',
          text: '',
          interaction: { id: 'hint_1', kind: 'approve', status: 'approved' },
          at: '2026-10-09T11:51:00.000Z',
        },
      ],
    });

    expect(out).toContain('ship it?');
    expect(out).toContain('[approve hint_1 → approved]');
    expect(out).toContain('--before act_1');
  });

  it('shows the answer to a question, so one left with --async or a timeout can be read later', () => {
    const asked = (id: string, kind: string, state: Record<string, string>) => ({
      id,
      from: 'agent' as const,
      text: '',
      interaction: { id: `hint_${id}`, kind, status: 'answered' },
      card: { kind, state: { status: 'answered', ...state } },
      at: '2026-10-09T11:51:00.000Z',
    });
    const out = formatConversationView({
      conversation: conversation(),
      hasMore: false,
      messages: [
        asked('c', 'choose', { label: 'Chosen by Ada in Telegram', optionLabel: 'Staging' }),
        asked('a', 'ask', { label: 'Answered by Ada in Telegram', text: 'prod, after 6pm' }),
      ],
    });

    expect(out).toContain('[choose hint_c → Chosen by Ada in Telegram]');
    expect(out).toContain('chose "Staging"');
    expect(out).toContain('answered: prod, after 6pm');
  });
});

describe('inbox commands', () => {
  let stdout: string;

  beforeEach(() => {
    stdout = '';
    listInbox.mockReset();
    getConversation.mockReset();
    clientFromConfig.mockReset();
    clientFromConfig.mockReturnValue({ client: {}, config });
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);

      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints { data, next } JSON scoped to the relay agent', async () => {
    listInbox.mockResolvedValue(page([conversation()], 'conv_1'));

    await expect(inboxListCommand({ filter: 'unread', json: true, limit: '5' })).rejects.toThrow('exit:0');

    expect(listInbox).toHaveBeenCalledWith({}, { filter: 'unread', limit: 5, agentIdentifier: 'human-relay' });
    expect(JSON.parse(stdout)).toEqual({ data: [conversation()], next: 'conv_1' });
  });

  it('exits 11 with an empty page when --wait times out', async () => {
    listInbox.mockResolvedValue(page([]));

    await expect(inboxListCommand({ filter: 'unread', wait: true, timeout: '0', json: true })).rejects.toThrow(
      'exit:11'
    );

    expect(listInbox).toHaveBeenCalledWith({}, { filter: 'unread', agentIdentifier: 'human-relay', wait: 0 });
    expect(JSON.parse(stdout)).toEqual({ data: [], next: null });
  });

  it('exits 0 when --wait returns conversations', async () => {
    listInbox.mockResolvedValue(page([conversation()]));

    await expect(inboxListCommand({ filter: 'unread', wait: true })).rejects.toThrow('exit:0');

    expect(stdout).toContain('conv_1');
  });

  it('prints the empty state and a next-page hint that keeps the filters', async () => {
    listInbox.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([conversation()], 'conv_1'));

    await expect(inboxListCommand({ filter: 'unread' })).rejects.toThrow('exit:0');
    expect(stdout).toContain('No conversations match.');
    expect(stdout).toContain('--senders all');

    await expect(inboxListCommand({ status: 'all' })).rejects.toThrow('exit:0');
    expect(stdout).toContain('npx @agentinbox/cli inbox list --status all --after conv_1');
  });

  it('rejects an unknown filter value and --timeout without --wait', async () => {
    await expect(inboxListCommand({ filter: 'new' })).rejects.toThrow('exit:1');
    await expect(inboxListCommand({ timeout: '10s' })).rejects.toThrow('exit:1');
    expect(listInbox).not.toHaveBeenCalled();
  });

  it('rejects a bad --limit with exit 1', async () => {
    await expect(inboxListCommand({ limit: 'abc' })).rejects.toThrow('exit:1');
    expect(listInbox).not.toHaveBeenCalled();
  });

  it('passes show pagination through', async () => {
    getConversation.mockResolvedValue({ conversation: conversation(), messages: [], hasMore: false });

    await expect(inboxShowCommand('conv_1', { before: 'act_9', json: true })).rejects.toThrow('exit:0');

    expect(getConversation).toHaveBeenCalledWith({}, 'conv_1', { before: 'act_9', agentIdentifier: 'human-relay' });
    expect(JSON.parse(stdout).conversation.id).toBe('conv_1');
  });
});
