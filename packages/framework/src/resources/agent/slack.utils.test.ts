import { describe, expect, it } from 'vitest';
import { withInThreadSlackOverrides } from './slack.utils';

describe('withInThreadSlackOverrides', () => {
  it('returns opts unchanged when the thread id is not a Slack ts', () => {
    const opts = { payload: { action: 'raise limit' } };

    expect(withInThreadSlackOverrides(opts, { threadId: 't1', channelId: 'c1', isDM: false })).toBe(opts);
  });

  it('attaches thread_ts from an encoded Slack platform thread id', () => {
    expect(
      withInThreadSlackOverrides(
        { payload: { action: 'raise limit' } },
        { threadId: 'slack:D123:1712345678.000100', channelId: 'D123', isDM: true }
      )
    ).toEqual({
      payload: { action: 'raise limit' },
      overrides: { slack: { thread_ts: '1712345678.000100' } },
    });
  });

  it('lets caller Slack overrides win over the inferred thread_ts', () => {
    expect(
      withInThreadSlackOverrides(
        { overrides: { slack: { thread_ts: '999.000200', unfurl_links: false } } },
        { threadId: '1712345678.000100', channelId: 'D123', isDM: true }
      )
    ).toEqual({
      overrides: { slack: { thread_ts: '999.000200', unfurl_links: false } },
    });
  });
});
