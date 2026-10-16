import { ENDPOINT_TYPES } from '@novu/stateless';
import axios from 'axios';
import { expect, test, vi } from 'vitest';
import { WeChatProvider } from './wechat.provider';

test('should trigger WeChat library correctly', async () => {
  const fakePost = vi.fn((webhookUrl, payload) => {
    return {
      headers: { 'x-request-id': 'default-id' },
      data: { errcode: 0, errmsg: 'ok' },
    };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
    } as any;
  });

  const provider = new WeChatProvider({});
  const testWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';
  const testContent = 'Hello WeChat Work!';
  
  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    msgtype: 'markdown',
    markdown: {
      content: 'Hello WeChat Work!',
    },
  });
  expect(result.id).toBe('default-id');
});

test('should throw error when WeChat API returns non-zero errcode', async () => {
  const fakePost = vi.fn((webhookUrl, payload) => {
    return {
      headers: {},
      data: { errcode: 93000, errmsg: 'invalid webhook url' },
    };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
    } as any;
  });

  const provider = new WeChatProvider({});
  const testWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=invalid-key';
  const testContent = 'Hello WeChat Work!';

  await expect(
    provider.sendMessage({
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: testContent,
    })
  ).rejects.toThrow('WeChat send failed with code 93000: invalid webhook url');
});

test('should handle passthrough data properly', async () => {
  const fakePost = vi.fn((webhookUrl, payload) => {
    return {
      headers: { 'x-request-id': 'passthrough-id' },
      data: { errcode: 0, errmsg: 'ok' },
    };
  });
  vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: fakePost,
    } as any;
  });

  const provider = new WeChatProvider({});
  const testWebhookUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';
  const testContent = 'Hello WeChat Work!';

  const result = await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          msgtype: 'text',
          text: {
            content: 'Overridden text content',
          },
        },
      },
    }
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    msgtype: 'text',
    markdown: {
      content: 'Hello WeChat Work!',
    },
    text: {
      content: 'Overridden text content',
    },
  });
  expect(result.id).toBe('passthrough-id');
});
