import { afterEach, expect, test, vi } from 'vitest';
import { AliyunSmsProvider } from './aliyun.provider';

afterEach(() => {
  vi.restoreAllMocks();
});

const okResponse = () => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ Code: 'OK', Message: 'OK', RequestId: 'req-1', BizId: 'mock-biz-id' }),
});

test('should trigger Aliyun SMS correctly', async () => {
  const provider = new AliyunSmsProvider({
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret',
    from: 'AliyunTest',
  });

  const fetchMock = vi.fn().mockResolvedValue(okResponse());
  global.fetch = fetchMock;

  const result = await provider.sendMessage(
    {
      content: '{"code":"1234"}',
      from: 'AliyunTest',
      to: '+8613800138000',
    },
    {
      _passthrough: {
        body: {
          TemplateCode: 'SMS_123456789',
        },
      },
    }
  );

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toContain('https://dysmsapi.aliyuncs.com/?');
  expect(init.method).toBe('GET');
  // system + business params are present in the signed query string
  expect(url).toContain('Action=SendSms');
  expect(url).toContain('Version=2017-05-25');
  expect(url).toContain('Signature=');
  expect(url).toContain('AccessKeyId=test-access-key-id');
  expect(url).toContain('SignName=AliyunTest');
  expect(url).toContain('TemplateCode=SMS_123456789');
  // phone number is percent-encoded ('+' -> %2B)
  expect(url).toContain('PhoneNumbers=%2B8613800138000');
  expect(result.id).toBe('mock-biz-id');
});

test('should let _passthrough override the resolved params', async () => {
  const provider = new AliyunSmsProvider({
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret',
    from: 'AliyunTest',
  });

  const fetchMock = vi.fn().mockResolvedValue(okResponse());
  global.fetch = fetchMock;

  await provider.sendMessage(
    {
      content: '{"code":"1234"}',
      from: 'AliyunTest',
      to: '+8613800138000',
    },
    {
      _passthrough: {
        body: {
          PhoneNumbers: '+8613900139000',
          TemplateCode: 'SMS_123456789',
        },
      },
    }
  );

  const [url] = fetchMock.mock.calls[0];
  expect(url).toContain('PhoneNumbers=%2B8613900139000');
});

test('should JSON-serialize a structured TemplateParam override', async () => {
  const provider = new AliyunSmsProvider({
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret',
    from: 'AliyunTest',
  });

  const fetchMock = vi.fn().mockResolvedValue(okResponse());
  global.fetch = fetchMock;

  await provider.sendMessage(
    {
      content: 'ignored',
      from: 'AliyunTest',
      to: '+8613800138000',
    },
    {
      _passthrough: {
        body: {
          TemplateCode: 'SMS_123456789',
          TemplateParam: { code: '1234' },
        },
      },
    }
  );

  const [url] = fetchMock.mock.calls[0];
  // `{ code: '1234' }` must be serialized to the JSON string Aliyun expects, not `[object Object]`.
  expect(url).toContain(`TemplateParam=${encodeURIComponent('{"code":"1234"}')}`);
  expect(url).not.toContain('object%20Object');
});

test('should throw when Aliyun returns a non-OK code', async () => {
  const provider = new AliyunSmsProvider({
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret',
    from: 'AliyunTest',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 400,
    json: () => Promise.resolve({ Code: 'isv.MOBILE_NUMBER_ILLEGAL', Message: 'invalid number' }),
  });

  await expect(
    provider.sendMessage({
      content: '{"code":"1234"}',
      from: 'AliyunTest',
      to: 'not-a-number',
    })
  ).rejects.toThrow('isv.MOBILE_NUMBER_ILLEGAL');
});

test('should throw when the response has no BizId even if it looks successful', async () => {
  const provider = new AliyunSmsProvider({
    accessKeyId: 'test-access-key-id',
    accessKeySecret: 'test-access-key-secret',
    from: 'AliyunTest',
  });

  // HTTP error whose body carries no `Code` — previously slipped through and
  // resolved as a success with `id: undefined`.
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ Message: 'Internal error' }),
  });

  await expect(
    provider.sendMessage({
      content: '{"code":"1234"}',
      from: 'AliyunTest',
      to: '+8613800138000',
    })
  ).rejects.toThrow('Aliyun SMS request failed');
});
