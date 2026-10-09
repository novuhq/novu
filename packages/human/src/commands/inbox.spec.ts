import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxPage, InboxThread } from '../api/inbox';
import type { HumanCliConfig } from '../config';

const listInbox = vi.fn();
const getInboxThread = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/inbox', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/inbox')>();

  return {
    ...original,
    listInbox: (...args: unknown[]) => listInbox(...args),
    getInboxThread: (...args: unknown[]) => getInboxThread(...args),
  };
});

vi.mock('./interact', async (importOriginal) => {
  const original = await importOriginal<typeof import('./interact')>();

  return {
    ...original,
    clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
  };
});

const { inboxListCommand, inboxShowCommand, parseListFilters, parseWait, waitForThreads } = await import('./inbox');
const { formatThreadReport, resolveAddress } = await import('./interact');
const { formatInboxThreadLine, formatInboxThreadView, formatRelativeTime, stripTerminalControls } = await import(
  '../output'
);

const config: HumanCliConfig = {
  apiUrl: 'https://api.novu.co',
  auth: { mode: 'apiKey', secretKey: 'key' },
  relayAgentIdentifier: 'human-relay',
  subscriberId: 'human_me',
};

const NOW = Date.parse('2026-10-09T12:00:00.000Z');

function thread(overrides: Partial<InboxThread> = {}): InboxThread {
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

function page(data: InboxThread[], next: string | null = null): InboxPage {
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

  it('starts a new thread with you when nobody is named', () => {
    expect(resolveAddress(config, {})).toEqual({ to: 'human_me' });
  });

  it('starts a new thread with the named contacts', () => {
    expect(resolveAddress(config, { to: 'ada, bob' })).toEqual({ to: ['ada', 'bob'] });
  });

  it('sends into a thread for anyone in it, ignoring the default recipient', () => {
    vi.stubEnv('HUMAN_TO', 'someone');

    expect(resolveAddress(config, { thread: ' conv_1 ' })).toEqual({ thread: 'conv_1' });
  });

  it('limits who may answer in a thread with --to', () => {
    expect(resolveAddress(config, { thread: 'conv_1', to: 'ada' })).toEqual({ thread: 'conv_1', to: ['ada'] });
  });
});

describe('formatThreadReport', () => {
  it('names the thread a send landed in', () => {
    expect(formatThreadReport({ threads: [{ id: 'conv_1', unreadBefore: 0 }] }, false)).toEqual(['thread: conv_1']);
    expect(formatThreadReport({}, false)).toEqual([]);
  });

  it('warns when a send to a contact landed in a thread with unread messages', () => {
    const lines = formatThreadReport({ threads: [{ id: 'conv_1', unreadBefore: 2 }] }, false);

    expect(lines[1]).toContain('had 2 unread messages');
    expect(lines[1]).toContain('human inbox show conv_1');
  });

  it('does not warn when the host chose the thread itself', () => {
    expect(formatThreadReport({ threads: [{ id: 'conv_1', unreadBefore: 2 }] }, true)).toEqual(['thread: conv_1']);
  });
});

describe('waitForThreads', () => {
  beforeEach(() => {
    listInbox.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-issues capped server waits until a thread arrives', async () => {
    listInbox.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([thread()]));

    const result = await waitForThreads({} as never, { filter: 'unread' }, Infinity);

    expect(result.data).toHaveLength(1);
    expect(listInbox).toHaveBeenCalledTimes(2);
    expect(listInbox).toHaveBeenNthCalledWith(1, {}, { filter: 'unread', wait: 25 });
  });

  it('stops at the deadline and asks only for the remaining time', async () => {
    let now = NOW;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    listInbox.mockImplementation(async (_client: unknown, query: { wait: number }) => {
      now += query.wait * 1000;

      return page([]);
    });

    const result = await waitForThreads({} as never, {}, 30);

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
    const line = formatInboxThreadLine(thread(), NOW);

    expect(line).toContain('conv_1');
    expect(line).toContain('telegram');
    expect(line).toContain('Ada');
    expect(line).toContain('2 unread');
    expect(line).toContain('"is the deploy done?"');
    expect(line).toContain('3m ago');
  });

  it('marks agent-authored previews and resolved threads', () => {
    const line = formatInboxThreadLine(
      thread({
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

  it('marks strangers in the list and in the thread view', () => {
    const stranger = thread({ kind: 'stranger', people: [{ id: 'telegram:888', kind: 'stranger' }] });
    const view = formatInboxThreadView({
      thread: stranger,
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

    expect(formatInboxThreadLine(stranger, NOW)).toContain('telegram:888 (stranger)');
    expect(view).toContain('Eve (stranger)');
  });

  it('strips terminal control sequences from contact-authored text', () => {
    expect(stripTerminalControls('\u001b[2J\u001b[Hhi\u001b]0;title\u0007 there\u0008\r')).toBe('hi there');
    expect(stripTerminalControls('line one\n\tline two')).toBe('line one\n\tline two');

    const view = formatInboxThreadView({
      thread: thread({ people: [{ id: 'ada', name: 'Ada\u001b[31m', kind: 'contact' }] }),
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
    const line = formatInboxThreadLine(
      thread({ lastMessage: { text: '\u001b[2Jhello', at: '2026-10-09T11:57:00.000Z', from: 'human' } }),
      NOW
    );

    expect(view).not.toContain('\u001b[2J');
    expect(view).not.toContain('\u001b[1A');
    expect(view).toContain('fake history');
    expect(view).toContain('xy.png');
    expect(line).not.toContain('\u001b[2J');
    expect(line).toContain('"hello"');
  });

  it('renders a thread view with interactions and an older-messages hint', () => {
    const out = formatInboxThreadView({
      thread: thread(),
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
});

describe('inbox commands', () => {
  let stdout: string;

  beforeEach(() => {
    stdout = '';
    listInbox.mockReset();
    getInboxThread.mockReset();
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
    listInbox.mockResolvedValue(page([thread()], 'conv_1'));

    await expect(inboxListCommand({ filter: 'unread', json: true, limit: '5' })).rejects.toThrow('exit:0');

    expect(listInbox).toHaveBeenCalledWith({}, { filter: 'unread', limit: 5, agentIdentifier: 'human-relay' });
    expect(JSON.parse(stdout)).toEqual({ data: [thread()], next: 'conv_1' });
  });

  it('exits 11 with an empty page when --wait times out', async () => {
    listInbox.mockResolvedValue(page([]));

    await expect(inboxListCommand({ filter: 'unread', wait: true, timeout: '0', json: true })).rejects.toThrow(
      'exit:11'
    );

    expect(listInbox).toHaveBeenCalledWith({}, { filter: 'unread', agentIdentifier: 'human-relay', wait: 0 });
    expect(JSON.parse(stdout)).toEqual({ data: [], next: null });
  });

  it('exits 0 when --wait returns threads', async () => {
    listInbox.mockResolvedValue(page([thread()]));

    await expect(inboxListCommand({ filter: 'unread', wait: true })).rejects.toThrow('exit:0');

    expect(stdout).toContain('conv_1');
  });

  it('prints the empty state and a next-page hint that keeps the filters', async () => {
    listInbox.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([thread()], 'conv_1'));

    await expect(inboxListCommand({ filter: 'unread' })).rejects.toThrow('exit:0');
    expect(stdout).toContain('No threads match.');
    expect(stdout).toContain('--senders all');

    await expect(inboxListCommand({ status: 'all' })).rejects.toThrow('exit:0');
    expect(stdout).toContain('human inbox list --status all --after conv_1');
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
    getInboxThread.mockResolvedValue({ thread: thread(), messages: [], hasMore: false });

    await expect(inboxShowCommand('conv_1', { before: 'act_9', json: true })).rejects.toThrow('exit:0');

    expect(getInboxThread).toHaveBeenCalledWith({}, 'conv_1', { before: 'act_9', agentIdentifier: 'human-relay' });
    expect(JSON.parse(stdout).thread.id).toBe('conv_1');
  });
});
