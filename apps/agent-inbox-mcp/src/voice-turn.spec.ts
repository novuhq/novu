import { describe, expect, it, vi } from 'vitest';
import type { AgentInboxApi } from './agent-inbox-api';
import {
  describeOutcome,
  describeVoiceCallPlaced,
  describeVoiceTurn,
  type Interaction,
  voiceTurn,
  waitForAnswer,
} from './interactions';

describe('voice turn helpers', () => {
  it('describes a placed voice call without waiting', () => {
    const text = describeVoiceCallPlaced({
      id: 'hi_1',
      kind: 'approve',
      status: 'pending',
      platform: 'voice',
    });

    expect(text).toContain('Call placed');
    expect(text).toContain('voice_turn');
    expect(text).toContain('hi_1');
  });

  it('redirects inbox_wait wording for a pending voice interaction', () => {
    const text = describeOutcome({
      id: 'hi_1',
      kind: 'approve',
      status: 'pending',
      platform: 'voice',
    });

    expect(text).toContain('live phone call');
    expect(text).toContain('voice_turn');
    expect(text).toContain('Do not call inbox_wait');
  });

  it('returns immediately from waitForAnswer on a voice interaction', async () => {
    const api = {
      get: vi.fn(),
      getRaw: vi.fn(),
      post: vi.fn(),
    } satisfies AgentInboxApi;

    const sent: Interaction = {
      id: 'hi_1',
      kind: 'approve',
      status: 'pending',
      platform: 'voice',
    };
    const sleep = vi.fn(async () => undefined);

    const result = await waitForAnswer(api, sent, 45, sleep);

    expect(result).toEqual(sent);
    expect(api.get).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('re-calls line-lessly after a timeout until an utterance arrives', async () => {
    const api = {
      get: vi.fn(),
      getRaw: vi.fn(),
      post: vi
        .fn()
        .mockResolvedValueOnce({ status: 'timeout' })
        .mockResolvedValueOnce({ status: 'utterance', utterance: 'yeah' }),
    } satisfies AgentInboxApi;
    const sleep = vi.fn(async () => undefined);

    const result = await voiceTurn(api, { id: 'hi_1', say: 'Can you confirm?', waitSeconds: 50 }, sleep, Date.now());

    expect(result).toEqual({ status: 'utterance', utterance: 'yeah' });
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[0][1]).toEqual({ say: 'Can you confirm?' });
    expect(api.post.mock.calls[1][1]).toEqual({});
    expect(sleep).toHaveBeenCalled();
  });

  it('repeats unspoken words while the phone is still ringing', async () => {
    const api = {
      get: vi.fn(),
      getRaw: vi.fn(),
      post: vi
        .fn()
        .mockResolvedValueOnce({ status: 'ringing' })
        .mockResolvedValueOnce({ status: 'utterance', utterance: 'hello' }),
    } satisfies AgentInboxApi;

    const result = await voiceTurn(
      api,
      { id: 'hi_1', say: 'Hello there', waitSeconds: 50 },
      async () => undefined,
      Date.now()
    );

    expect(result).toEqual({ status: 'utterance', utterance: 'hello' });
    expect(api.post.mock.calls[1][1]).toEqual({ say: 'Hello there' });
  });

  it('returns the last listening state when another full wait will not fit', async () => {
    const start = 1_700_000_000_000;
    let now = start;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const api = {
      get: vi.fn(),
      getRaw: vi.fn(),
      post: vi.fn(async () => {
        now += 25_000;

        return { status: 'timeout' as const };
      }),
    } satisfies AgentInboxApi;

    try {
      const result = await voiceTurn(api, { id: 'hi_1', waitSeconds: 45 }, async () => undefined, start);

      expect(result).toEqual({ status: 'timeout' });
      expect(api.post).toHaveBeenCalledTimes(1);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('describes a settled approve turn', () => {
    expect(
      describeVoiceTurn('hi_1', {
        status: 'settled',
        decision: 'approve',
        answer: 'yeah go ahead',
      })
    ).toContain('Approved');
  });
});
