import { CardElement, ENDPOINT_TYPES } from '@novu/stateless';
import { describe, expect, test, vi } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { SlackProvider } from './slack.provider';

// The runtime `esmImport` uses `new Function('return import(...)')` so the CJS build can load
// the ESM-only chat adapter. That indirection has no dynamic-import callback under Vitest, so
// swap it for a transform-aware dynamic import that resolves the real adapter.
vi.mock('../../../utils/esm-import', () => ({
  esmImport: (specifier: string) => import(/* @vite-ignore */ specifier),
}));

const richCard: CardElement = {
  type: 'card',
  children: [
    { type: 'text', content: 'Deployment succeeded', style: 'bold' },
    { type: 'divider' },
    {
      type: 'actions',
      children: [{ type: 'link-button', label: 'View run', url: 'https://novu.co/run/1' }],
    },
  ],
};

describe('SlackProvider.render', () => {
  test('serializes a CardElement to Block Kit blocks + fallback text', async () => {
    const provider = new SlackProvider();
    const result = await provider.render(richCard);

    expect(Array.isArray(result.nativePayload.blocks)).toBe(true);
    expect((result.nativePayload.blocks as unknown[]).length).toBeGreaterThan(0);
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.validation).toEqual([]);
  });
});

test('should deliver a rendered card as Block Kit blocks over webhook', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: 'ok',
  });

  const provider = new SlackProvider();
  // The worker renders the card once, before send, and hands the native payload to the provider.
  const rendered = await provider.render(richCard);
  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'https://hooks.slack.com/services/test',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: rendered.content,
    nativePayload: rendered.nativePayload,
  });

  const call = mockSafeOutboundJsonRequest.mock.calls[0][0];
  expect(call.url).toBe('https://hooks.slack.com/services/test');
  expect(Array.isArray(call.body.blocks)).toBe(true);
  expect((call.body.blocks as unknown[]).length).toBeGreaterThan(0);
  expect(typeof call.body.text).toBe('string');
});

test('should trigger Slack webhook correctly', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: 'ok',
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'https://hooks.slack.com/services/test',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://hooks.slack.com/services/test',
    method: 'POST',
    headers: undefined,
    body: {
      text: 'chat message',
      blocks: undefined,
    },
  });
  expect(result.id).toBeDefined();
  expect(result.date).toBeDefined();
});

test('should trigger Slack webhook correctly with _passthrough', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: 'ok',
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage(
    {
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
        endpoint: {
          url: 'https://hooks.slack.com/services/test',
        },
      },
      content: 'chat message',
    },
    {
      _passthrough: {
        body: {
          text: 'chat message _passthrough',
        },
      },
    }
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledWith({
    url: 'https://hooks.slack.com/services/test',
    method: 'POST',
    headers: undefined,
    body: {
      text: 'chat message _passthrough',
      blocks: undefined,
    },
  });
  expect(result.id).toBeDefined();
  expect(result.date).toBeDefined();
});

test('should handle Slack API error correctly', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: false,
      error: 'channel_not_found',
    },
  });

  const provider = new SlackProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        token: 'xoxb-token-123',
        type: ENDPOINT_TYPES.SLACK_CHANNEL,
        identifier: 'test-slack-channel-identifier',
        endpoint: {
          channelId: 'C1234567890',
        },
      },
      content: 'chat message',
    })
  ).rejects.toThrow('Slack API Error: channel_not_found');

  expect(mockPost).toHaveBeenCalledWith(
    'https://slack.com/api/chat.postMessage',
    {
      text: 'chat message',
      blocks: undefined,
      channel: 'C1234567890',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xoxb-token-123',
      },
    }
  );
});

test('should handle Slack webhook error response correctly', async () => {
  safeOutboundJsonSpy({
    body: 'invalid_payload',
  });

  const provider = new SlackProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          url: 'https://hooks.slack.com/services/test',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    })
  ).rejects.toThrow('Slack Webhook Error');
});

test('should handle Slack webhook HTTP error correctly', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: 'ok',
  });

  mockSafeOutboundJsonRequest.mockRejectedValueOnce(new Error('Request failed with status code 400'));

  const provider = new SlackProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          url: 'https://hooks.slack.com/services/test',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    })
  ).rejects.toThrow('Request failed with status code 400');
});

test('should trigger Slack app correctly with OAuth and return the message ts as id', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456',
    },
    headers: {
      'x-slack-req-id': 'req-channel-1',
    },
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      token: 'xoxb-token-123',
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      identifier: 'test-slack-channel-identifier',
      endpoint: {
        channelId: 'C1234567890',
      },
    },
    content: 'chat message via app',
  });

  expect(mockPost).toHaveBeenCalledWith(
    'https://slack.com/api/chat.postMessage',
    {
      text: 'chat message via app',
      blocks: undefined,
      channel: 'C1234567890',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xoxb-token-123',
      },
    }
  );
  expect(result.id).toBe('C1234567890:1234567890.123456');
});

test('should echo the DM conversation from Slack response channel, not the user id we posted to', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      channel: 'D999888777',
      ts: '1777837477.371619',
    },
    headers: {
      'x-slack-req-id': 'req-dm-1',
    },
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      token: 'xoxb-token-123',
      type: ENDPOINT_TYPES.SLACK_USER,
      identifier: 'test-slack-user-identifier',
      endpoint: {
        userId: 'U1234567890',
      },
    },
    content: 'direct message via app',
  });

  expect(mockPost).toHaveBeenCalledWith(
    'https://slack.com/api/chat.postMessage',
    {
      text: 'direct message via app',
      blocks: undefined,
      channel: 'U1234567890',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xoxb-token-123',
      },
    }
  );
  expect(result.id).toBe('D999888777:1777837477.371619');
});

test('should not echo a channel for Slack webhook sends', async () => {
  safeOutboundJsonSpy({
    body: 'ok',
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'https://hooks.slack.com/services/test',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(result.channel).toBeUndefined();
});

test('should update a Slack app message via chat.update', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456',
    },
  });

  const provider = new SlackProvider();
  const result = await provider.updateMessage(
    {
      channelData: {
        token: 'xoxb-token-123',
        type: ENDPOINT_TYPES.SLACK_CHANNEL,
        identifier: 'test-slack-channel-identifier',
        endpoint: {
          channelId: 'C1234567890',
        },
      },
      content: 'updated message',
      nativePayload: { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'updated' } }] },
    },
    'C1234567890:1234567890.123456'
  );

  expect(mockPost).toHaveBeenCalledWith(
    'https://slack.com/api/chat.update',
    {
      text: 'updated message',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'updated' } }],
      channel: 'C1234567890',
      ts: '1234567890.123456',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xoxb-token-123',
      },
    }
  );
  expect(result.id).toBe('C1234567890:1234567890.123456');
});

test('should throw when a Slack app identifier is not channel:ts', async () => {
  axiosSpy({ data: { ok: true } });

  const provider = new SlackProvider();

  await expect(
    provider.updateMessage(
      {
        channelData: {
          token: 'xoxb-token-123',
          type: ENDPOINT_TYPES.SLACK_CHANNEL,
          identifier: 'test-slack-channel-identifier',
          endpoint: {
            channelId: 'C1234567890',
          },
        },
        content: 'updated message',
      },
      'not-a-slack-id'
    )
  ).rejects.toThrow('Slack message identifier "not-a-slack-id" is not channel:ts');
});

test('should send a new webhook message when updateMessage cannot edit in place', async () => {
  const { mockSafeOutboundJsonRequest } = safeOutboundJsonSpy({
    body: 'ok',
  });

  const provider = new SlackProvider();
  const result = await provider.updateMessage(
    {
      channelData: {
        endpoint: {
          url: 'https://hooks.slack.com/services/test',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'updated message',
    },
    'webhook-id-1'
  );

  expect(mockSafeOutboundJsonRequest).toHaveBeenCalledTimes(1);
  expect(mockSafeOutboundJsonRequest.mock.calls[0][0].url).toBe('https://hooks.slack.com/services/test');
  expect(mockSafeOutboundJsonRequest.mock.calls[0][0].body.text).toBe('updated message');
  expect(result.id).toBeDefined();
});
