import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxPage, InboxThread } from '../api/inbox';
import type { HumanCliConfig } from '../config';

const listInbox = vi.fn();
const getInboxThread = vi.fn();
const replyInboxThread = vi.fn();
const createInboxInteraction = vi.fn();
const clientFromConfig = vi.fn();

vi.mock('../api/inbox', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/inbox')>();

  return {
    ...original,
    listInbox: (...args: unknown[]) => listInbox(...args),
    getInboxThread: (...args: unknown[]) => getInboxThread(...args),
    replyInboxThread: (...args: unknown[]) => replyInboxThread(...args),
    createInboxInteraction: (...args: unknown[]) => createInboxInteraction(...args),
  };
});

vi.mock('./interact', async (importOriginal) => {
  const original = await importOriginal<typeof import('./interact')>();

  return {
    ...original,
    clientFromConfig: (...args: unknown[]) => clientFromConfig(...args),
  };
});

const { inboxListCommand, inboxReplyCommand, inboxShowCommand, parseWait, runInboxInteraction, waitForThreads } =
  await import('./inbox');
const { formatInboxThreadLine, formatInboxThreadView, formatRelativeTime } = await import('../output');

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
    from: { subscriberId: 'ada', name: 'Ada' },
    status: 'active',
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
    expect(parseWait(undefined)).toBeUndefined();
    expect(parseWait(true)).toBe(Infinity);
    expect(parseWait('90s')).toBe(90);
    expect(parseWait('2m')).toBe(120);
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

    const result = await waitForThreads({} as never, { unread: true }, Infinity);

    expect(result.data).toHaveLength(1);
    expect(listInbox).toHaveBeenCalledTimes(2);
    expect(listInbox).toHaveBeenNthCalledWith(1, {}, { unread: true, wait: 25 });
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

  it('renders the channel, sender, unread count and preview on one line', () => {
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
    replyInboxThread.mockReset();
    createInboxInteraction.mockReset();
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

    await expect(inboxListCommand({ unread: true, json: true, limit: '5' })).rejects.toThrow('exit:0');

    expect(listInbox).toHaveBeenCalledWith({}, { unread: true, limit: 5, agentIdentifier: 'human-relay' });
    expect(JSON.parse(stdout)).toEqual({ data: [thread()], next: 'conv_1' });
  });

  it('exits 11 with an empty page when --wait times out', async () => {
    listInbox.mockResolvedValue(page([]));

    await expect(inboxListCommand({ unread: true, wait: '0', json: true })).rejects.toThrow('exit:11');

    expect(listInbox).toHaveBeenCalledWith({}, { unread: true, agentIdentifier: 'human-relay', wait: 0 });
    expect(JSON.parse(stdout)).toEqual({ data: [], next: null });
  });

  it('exits 0 when --wait returns threads', async () => {
    listInbox.mockResolvedValue(page([thread()]));

    await expect(inboxListCommand({ unread: true, wait: true })).rejects.toThrow('exit:0');

    expect(stdout).toContain('conv_1');
  });

  it('prints the empty state and a next-page hint in human mode', async () => {
    listInbox.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([thread()], 'conv_1'));

    await expect(inboxListCommand({ unread: true })).rejects.toThrow('exit:0');
    expect(stdout).toContain('No unread threads.');

    await expect(inboxListCommand({})).rejects.toThrow('exit:0');
    expect(stdout).toContain('human inbox --after conv_1');
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

  it('replies on the thread channel and refuses empty text', async () => {
    replyInboxThread.mockResolvedValue({ thread: thread(), messageId: 'act_2' });

    await expect(inboxReplyCommand('conv_1', 'on it', {})).rejects.toThrow('exit:0');
    expect(replyInboxThread).toHaveBeenCalledWith({}, 'conv_1', 'on it', 'human-relay');
    expect(stdout).toContain('Replied on telegram in conv_1.');

    await expect(inboxReplyCommand('conv_1', '   ', {})).rejects.toThrow('exit:1');
    expect(replyInboxThread).toHaveBeenCalledTimes(1);
  });

  it('posts an async in-thread card and returns it still pending (exit 11)', async () => {
    createInboxInteraction.mockResolvedValue({ id: 'hint_1', kind: 'approve', status: 'pending' });

    await expect(
      runInboxInteraction('approve', 'conv_1', 'Deploy to prod?', { async: true, json: true, ttl: '10m' })
    ).rejects.toThrow('exit:11');

    expect(createInboxInteraction).toHaveBeenCalledWith(
      {},
      'conv_1',
      expect.objectContaining({
        kind: 'approve',
        ttlSeconds: 600,
        card: expect.objectContaining({ title: 'Deploy to prod?' }),
      }),
      'human-relay'
    );
    expect(JSON.parse(stdout).id).toBe('hint_1');
  });
});
