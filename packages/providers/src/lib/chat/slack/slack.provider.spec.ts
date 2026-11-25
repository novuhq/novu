import { CardElement, ENDPOINT_TYPES } from '@novu/stateless';
import { describe, expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { safeOutboundJsonSpy } from '../../../utils/test/spy-safe-outbound';
import { SlackProvider } from './slack.provider';

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

describe('SlackProvider.sendFiles', () => {
  const uploadUrl = 'https://files.slack.com/upload/v1/ABC123';
  const pdf = { name: 'report.pdf', mime: 'application/pdf', file: Buffer.from('%PDF-1.7 report') };
  const csv = { name: 'rows.csv', mime: 'text/csv', file: Buffer.from('a,b\n1,2\n') };

  const slackChannel = {
    token: 'xoxb-token-123',
    type: ENDPOINT_TYPES.SLACK_CHANNEL,
    identifier: 'slack-channel',
    endpoint: { channelId: 'C1234567890' },
  } as const;

  function mockSlackFileApi(
    overrides: { getUploadURL?: (body: string) => unknown; complete?: (body: unknown) => unknown } = {}
  ) {
    const { mockPost } = axiosSpy();
    let fileCounter = 0;

    mockPost.mockImplementation((url: string, body: unknown) => {
      if (url === 'https://slack.com/api/files.getUploadURLExternal') {
        fileCounter += 1;

        return {
          data: overrides.getUploadURL?.(body as string) ?? {
            ok: true,
            upload_url: `${uploadUrl}-${fileCounter}`,
            file_id: `F00${fileCounter}`,
          },
        };
      }

      if (url === 'https://slack.com/api/files.completeUploadExternal') {
        return { data: overrides.complete?.(body) ?? { ok: true, files: [] } };
      }

      return { data: 'OK - 1' };
    });

    return mockPost;
  }

  test('uploads each file, then shares them once in the channel the message went to', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: slackChannel,
      files: [pdf, csv],
      sentMessage: { id: 'C1234567890:1700000000.000100', channel: 'C1234567890' },
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'sent' },
      { name: 'rows.csv', status: 'sent' },
    ]);

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      'https://slack.com/api/files.getUploadURLExternal',
      `filename=report.pdf&length=${pdf.file.length}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer xoxb-token-123',
        },
      }
    );
    expect(mockPost).toHaveBeenNthCalledWith(2, `${uploadUrl}-1`, pdf.file, {
      headers: { 'Content-Type': 'application/octet-stream' },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    expect(mockPost).toHaveBeenNthCalledWith(4, `${uploadUrl}-2`, csv.file, expect.anything());
    expect(mockPost).toHaveBeenNthCalledWith(
      5,
      'https://slack.com/api/files.completeUploadExternal',
      {
        files: [
          { id: 'F001', title: 'report.pdf' },
          { id: 'F002', title: 'rows.csv' },
        ],
        channel_id: 'C1234567890',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer xoxb-token-123',
        },
      }
    );
    expect(mockPost).toHaveBeenCalledTimes(5);
  });

  test('shares DM files in the conversation Slack opened for the user', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    await provider.sendFiles({
      channelData: {
        token: 'xoxb-token-123',
        type: ENDPOINT_TYPES.SLACK_USER,
        identifier: 'slack-user',
        endpoint: { userId: 'U1234567890' },
      },
      files: [pdf],
      sentMessage: { id: 'D999888777:1700000000.000100', channel: 'D999888777' },
    });

    expect(mockPost).toHaveBeenLastCalledWith(
      'https://slack.com/api/files.completeUploadExternal',
      { files: [{ id: 'F001', title: 'report.pdf' }], channel_id: 'D999888777' },
      expect.anything()
    );
  });

  test('falls back to the user id when the DM conversation is unknown', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    await provider.sendFiles({
      channelData: {
        token: 'xoxb-token-123',
        type: ENDPOINT_TYPES.SLACK_USER,
        identifier: 'slack-user',
        endpoint: { userId: 'U1234567890' },
      },
      files: [pdf],
      sentMessage: {},
    });

    expect(mockPost).toHaveBeenLastCalledWith(
      'https://slack.com/api/files.completeUploadExternal',
      { files: [{ id: 'F001', title: 'report.pdf' }], channels: 'U1234567890' },
      expect.anything()
    );
  });

  test('puts the files in the same thread as the message', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    await provider.sendFiles({
      channelData: slackChannel,
      files: [pdf],
      sentMessage: { channel: 'C1234567890' },
      bridgeProviderData: { thread_ts: '1700000000.000001' },
    });

    expect(mockPost).toHaveBeenLastCalledWith(
      'https://slack.com/api/files.completeUploadExternal',
      { files: [{ id: 'F001', title: 'report.pdf' }], channel_id: 'C1234567890', thread_ts: '1700000000.000001' },
      expect.anything()
    );
  });

  test('skips every file for incoming webhooks without calling Slack', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'webhook',
        endpoint: { url: 'https://hooks.slack.com/services/test' },
      },
      files: [pdf],
      sentMessage: {},
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'skipped', reason: expect.stringContaining("incoming webhooks can't carry files") },
    ]);
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('reports the missing files:write scope and does not share anything', async () => {
    const mockPost = mockSlackFileApi({
      getUploadURL: () => ({ ok: false, error: 'missing_scope', needed: 'files:write' }),
    });
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: slackChannel,
      files: [pdf],
      sentMessage: { channel: 'C1234567890' },
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'failed', reason: expect.stringContaining('missing the files:write scope') },
    ]);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('marks uploaded files failed when Slack refuses to share them', async () => {
    mockSlackFileApi({ complete: () => ({ ok: false, error: 'not_in_channel' }) });
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: slackChannel,
      files: [pdf, csv],
      sentMessage: { channel: 'C1234567890' },
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'failed', reason: expect.stringContaining('Invite the app to the channel') },
      { name: 'rows.csv', status: 'failed', reason: expect.stringContaining('Invite the app to the channel') },
    ]);
  });

  test('never sends bytes to an upload address outside Slack', async () => {
    const mockPost = mockSlackFileApi({
      getUploadURL: () => ({ ok: true, upload_url: 'https://attacker.example.com/upload', file_id: 'F001' }),
    });
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: slackChannel,
      files: [pdf],
      sentMessage: { channel: 'C1234567890' },
    });

    expect(results[0].status).toBe('failed');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('skips an empty file and still sends the rest', async () => {
    const mockPost = mockSlackFileApi();
    const provider = new SlackProvider();

    const results = await provider.sendFiles({
      channelData: slackChannel,
      files: [{ name: 'empty.txt', mime: 'text/plain', file: Buffer.alloc(0) }, csv],
      sentMessage: { channel: 'C1234567890' },
    });

    expect(results).toEqual([
      { name: 'empty.txt', status: 'skipped', reason: 'The file is empty.' },
      { name: 'rows.csv', status: 'sent' },
    ]);
    expect(mockPost).toHaveBeenLastCalledWith(
      'https://slack.com/api/files.completeUploadExternal',
      { files: [{ id: 'F001', title: 'rows.csv' }], channel_id: 'C1234567890' },
      expect.anything()
    );
  });
});

test('should return the channel the bot message landed in', async () => {
  axiosSpy({ data: { ok: true, channel: 'C1234567890', ts: '1234567890.123456' } });

  const provider = new SlackProvider();
  const result = await provider.sendMessage({
    channelData: {
      token: 'xoxb-token-123',
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      identifier: 'test-slack-channel-identifier',
      endpoint: { channelId: 'C1234567890' },
    },
    content: 'chat message via app',
  });

  expect(result.channel).toBe('C1234567890');
});
