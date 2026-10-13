import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxThread, InboxThreadView } from './inbox';
import { listInbox } from './inbox';
import { formatInboxPage, formatThreadDigest, formatThreadLine, stripControls } from './inbox-digest';
import worker from './index';
import { DEFAULT_MESSAGES, DEFAULT_STRANGER_THREAD, rpc, setup, stubBackends } from './spec-support';

describe('inbox tools — a host sees a thread, reads it, replies and resolves it', () => {
  beforeEach(() => {
    stubBackends();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('walks list → show → ask in thread → resolve', async () => {
    const calls = stubBackends({
      interaction: {
        status: 'answered',
        response: { type: 'text', text: 'Sure', respondedBy: 'Pat' },
      },
    });
    const { env, ctx } = setup();

    const listResponse = await worker.fetch(
      rpc('tools/call', { name: 'inbox_list', arguments: { filter: 'unread', senders: 'all' } }),
      env,
      ctx
    );
    const listResult = (await listResponse.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };
    expect(listResult.result.isError).toBeFalsy();
    expect(listResult.result.content[0].text).toContain('conv_stranger_1');
    expect(listResult.result.content[0].text).toContain('(stranger)');
    expect(listResult.result.content[0].text).toContain('Caution:');

    const listCall = calls.find((call) => call.url.includes('/v1/human/inbox') && !call.url.includes('/inbox/'));
    expect(listCall?.url).toContain('filter=unread');
    expect(listCall?.url).toContain('senders=all');

    const showResponse = await worker.fetch(
      rpc('tools/call', { name: 'inbox_show', arguments: { thread: 'conv_stranger_1' } }),
      env,
      ctx
    );
    const showResult = (await showResponse.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };
    expect(showResult.result.isError).toBeFalsy();
    expect(showResult.result.content[0].text).toContain('Hello agent');
    expect(showResult.result.content[0].text).toContain('(stranger)');
    // Showing must not call mark-read.
    expect(calls.some((call) => call.url.endsWith('/read') && call.method === 'POST')).toBe(false);

    const askResponse = await worker.fetch(
      rpc('tools/call', {
        name: 'ask',
        arguments: {
          question: 'How can I help?',
          thread: 'conv_stranger_1',
          anyone_may_answer: true,
          wait_seconds: 0,
        },
      }),
      env,
      ctx
    );
    const askResult = (await askResponse.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };
    expect(askResult.result.isError).toBeFalsy();
    expect(askResult.result.content[0].text).toMatch(/Answered|No answer yet|unread|inbox_show/);

    const created = calls.find((call) => call.url.endsWith('/v1/human/interactions') && call.method === 'POST');
    expect(created?.body).toMatchObject({
      kind: 'ask',
      thread: 'conv_stranger_1',
      anyoneMayAnswer: true,
      card: { title: 'How can I help?' },
    });
    expect(created?.body).not.toHaveProperty('to');

    const resolveResponse = await worker.fetch(
      rpc('tools/call', { name: 'inbox_resolve', arguments: { thread: 'conv_stranger_1' } }),
      env,
      ctx
    );
    const resolveResult = (await resolveResponse.json()) as {
      result: { content: Array<{ text: string }>; isError?: boolean };
    };
    expect(resolveResult.result.isError).toBeFalsy();
    expect(resolveResult.result.content[0].text).toContain('resolved');
    expect(calls.some((call) => call.url.endsWith('/resolve') && call.method === 'POST')).toBe(true);
  });

  it('keeps next through the list envelope and gives wait a timeout above the hold', async () => {
    const page = {
      data: [DEFAULT_STRANGER_THREAD],
      next: 'conv_cursor_2',
    };
    stubBackends({ inboxPage: page });

    const getRaw = vi.fn(async () => page);
    const api = { get: vi.fn(), getRaw, post: vi.fn() };

    const result = await listInbox(api as never, { filter: 'unread', wait: 10 });

    expect(result).toEqual(page);
    expect(getRaw).toHaveBeenCalledWith(
      '/v1/human/inbox',
      expect.objectContaining({ filter: 'unread', wait: 10 }),
      20_000
    );
  });

  it('marks a thread read when asked', async () => {
    const calls = stubBackends();
    const { env, ctx } = setup();

    const response = await worker.fetch(
      rpc('tools/call', { name: 'inbox_read', arguments: { thread: 'conv_stranger_1' } }),
      env,
      ctx
    );
    const { result } = (await response.json()) as { result: { content: Array<{ text: string }>; isError?: boolean } };

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('marked read');
    expect(calls.some((call) => call.url.endsWith('/read') && call.method === 'POST')).toBe(true);
  });
});

describe('inbox digests', () => {
  const now = new Date('2026-10-12T10:05:00.000Z').getTime();

  it('labels strangers on a thread line and truncates the preview', () => {
    const long = 'x'.repeat(120);
    const thread: InboxThread = {
      ...DEFAULT_STRANGER_THREAD,
      lastMessage: { text: long, at: '2026-10-12T10:00:00.000Z', from: 'human' },
    };

    const line = formatThreadLine(thread, now);

    expect(line).toContain('conv_stranger_1');
    expect(line).toContain('Pat (stranger)');
    expect(line).toContain('2 unread');
    expect(line).toContain('…');
    expect(line.length).toBeLessThan(long.length + 80);
  });

  it('labels stranger messages, truncates bodies and appends a caution', () => {
    const view: InboxThreadView = {
      thread: DEFAULT_STRANGER_THREAD,
      messages: [
        {
          ...DEFAULT_MESSAGES[0],
          text: 'y'.repeat(600),
        },
      ],
      hasMore: true,
    };

    const digest = formatThreadDigest(view);

    expect(digest).toContain('Pat (stranger)');
    expect(digest).toContain('(message truncated)');
    expect(digest).toContain('before "msg_1"');
    expect(digest).toContain('Caution:');
    expect(digest).toContain('not a contact');
  });

  it('hints at senders=all when the list is empty', () => {
    expect(formatInboxPage({ data: [], next: null })).toContain('senders is "all"');
  });

  it('strips control characters from contact text', () => {
    expect(stripControls('hi\u001b[2Jthere')).toBe('hithere');
  });
});
