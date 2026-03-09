import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ClickUpProvider } from './clickup.provider';

const WORKSPACE_ID = 'ws_123';
const CHANNEL_ID = 'ch_456';

function makeChannelData() {
  return {
    type: ENDPOINT_TYPES.CLICKUP_CHANNEL as typeof ENDPOINT_TYPES.CLICKUP_CHANNEL,
    endpoint: { workspaceId: WORKSPACE_ID, channelId: CHANNEL_ID },
    identifier: 'test-channel',
  };
}

test('should send a message to a workspace channel', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'msg-123' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  const result = await provider.sendMessage({
    content: 'Test notification',
    channelData: makeChannelData(),
  });

  expect(mockPost).toHaveBeenCalledWith(
    `/workspaces/${WORKSPACE_ID}/chat/channels/${CHANNEL_ID}/messages`,
    { content: 'Test notification', type: 'message' }
  );
  expect(result.id).toBe('msg-123');
  expect(result.date).toBeDefined();
});

test('should forward customData fields in the payload', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'msg-456' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await provider.sendMessage({
    content: 'Task update',
    channelData: makeChannelData(),
    customData: { notify_all: true },
  });

  expect(mockPost).toHaveBeenCalledWith(
    `/workspaces/${WORKSPACE_ID}/chat/channels/${CHANNEL_ID}/messages`,
    { content: 'Task update', type: 'message', notify_all: true }
  );
});

test('should support _passthrough data', async () => {
  const { mockPost } = axiosSpy({
    data: { id: 'msg-789' },
  });

  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await provider.sendMessage(
    {
      content: 'Passthrough test',
      channelData: makeChannelData(),
    },
    {
      _passthrough: {
        body: {
          attachments: [{ url: 'https://example.com/file.png' }],
        },
      },
    }
  );

  expect(mockPost).toHaveBeenCalledWith(
    `/workspaces/${WORKSPACE_ID}/chat/channels/${CHANNEL_ID}/messages`,
    {
      content: 'Passthrough test',
      type: 'message',
      attachments: [{ url: 'https://example.com/file.png' }],
    }
  );
});

test('should throw when channelData is missing', async () => {
  axiosSpy({});
  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await expect(
    provider.sendMessage({
      content: 'Test notification',
    })
  ).rejects.toThrow('ClickUp provider requires channelData of type clickup_channel');
});

test('should throw when channelData is wrong type', async () => {
  axiosSpy({});
  const provider = new ClickUpProvider({ apiKey: 'pk_test_key' });

  await expect(
    provider.sendMessage({
      content: 'Test notification',
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: { url: 'https://example.com' },
        identifier: 'test',
      },
    })
  ).rejects.toThrow('ClickUp provider requires channelData of type clickup_channel');
});
