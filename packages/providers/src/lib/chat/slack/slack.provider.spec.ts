import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SlackProvider } from './slack.provider';

test('should trigger Slack webhook correctly', async () => {
  const { mockPost } = axiosSpy({
    data: 'ok', // Webhooks return plain text "ok"
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: 'webhookUrl',
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: 'chat message',
  });

  expect(mockPost).toHaveBeenCalledWith('webhookUrl', {
    text: 'chat message',
    blocks: undefined,
  });
  expect(result.id).toBeDefined();
  expect(result.date).toBeDefined();
});

test('should trigger Slack webhook correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: 'ok',
  });

  const provider = new SlackProvider();
  const result = await provider.sendMessage(
    {
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
        endpoint: {
          url: 'webhookUrl',
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

  expect(mockPost).toHaveBeenCalledWith('webhookUrl', {
    text: 'chat message _passthrough',
    blocks: undefined,
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
  const { mockPost } = axiosSpy({
    data: 'invalid_payload', // Webhook returns error message instead of "ok"
  });

  const provider = new SlackProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          url: 'webhookUrl',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    })
  ).rejects.toThrow('Slack Webhook Error');

  expect(mockPost).toHaveBeenCalledWith('webhookUrl', {
    text: 'chat message',
    blocks: undefined,
  });
});

test('should handle Slack webhook HTTP error correctly', async () => {
  const { mockPost } = axiosSpy();

  // Simulate axios throwing for HTTP 400 (bad request)
  mockPost.mockRejectedValueOnce(new Error('Request failed with status code 400'));

  const provider = new SlackProvider();

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          url: 'webhookUrl',
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: 'chat message',
    })
  ).rejects.toThrow('Request failed with status code 400');

  expect(mockPost).toHaveBeenCalledWith('webhookUrl', {
    text: 'chat message',
    blocks: undefined,
  });
});

test('should trigger Slack app correctly with OAuth', async () => {
  const { mockPost } = axiosSpy({
    data: {
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456',
    },
  });

  const provider = new SlackProvider();
  await provider.sendMessage({
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
});
