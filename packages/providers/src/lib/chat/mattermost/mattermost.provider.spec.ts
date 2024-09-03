import { expect, test, vi } from 'vitest';
import axios from 'axios';
import { MattermostProvider } from './mattermost.provider';

test('should trigger mattermost library correctly, default channel', async () => {
  const fakePostDefaultChannel = vi.fn((webhookUrl, payload) => {
    expect(payload.channel).toBe(undefined);

    return { headers: { 'x-request-id': 'default' } };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePostDefaultChannel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage({
    webhookUrl: testWebhookUrl,
    content: testContent,
  });
  expect(fakePostDefaultChannel).toHaveBeenCalled();
  expect(fakePostDefaultChannel).toHaveBeenCalledWith(testWebhookUrl, {
    text: 'Dummy content message',
  });
  expect(result.id).toBe('default');
});

test('should trigger mattermost library correctly, override channel', async () => {
  const fakePostUserChannel = vi.fn((webhookUrl, payload) => {
    expect(payload.channel).toBe('@username');

    return { headers: { 'x-request-id': 'username' } };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePostUserChannel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage({
    webhookUrl: testWebhookUrl,
    content: testContent,
    channel: '@username',
  });
  expect(fakePostUserChannel).toHaveBeenCalled();
  expect(fakePostUserChannel).toHaveBeenCalledWith(testWebhookUrl, {
    channel: '@username',
    text: 'Dummy content message',
  });
  expect(result.id).toBe('username');
});

test('should trigger mattermost library correctly, default channel with _passthrough', async () => {
  const fakePostDefaultChannel = vi.fn((webhookUrl, payload) => {
    expect(payload.channel).toBe(undefined);

    return { headers: { 'x-request-id': 'default' } };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePostDefaultChannel,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  const provider = new MattermostProvider();
  const testWebhookUrl = 'https://mattermost.dummy.webhook.com';
  const testContent = 'Dummy content message';
  const result = await provider.sendMessage(
    {
      webhookUrl: testWebhookUrl,
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          text: '_passthrough content message',
        },
      },
    },
  );
  expect(fakePostDefaultChannel).toHaveBeenCalled();
  expect(fakePostDefaultChannel).toHaveBeenCalledWith(testWebhookUrl, {
    text: '_passthrough content message',
  });
  expect(result.id).toBe('default');
});
