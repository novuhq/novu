import { expect, test, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ISendProSmsProvider } from './isendpro-sms.provider';

vi.mock('axios');

const mockConfig = {
  apiKey: 'test-api-key',
  from: 'NOVU',
};

const mockSMSMessage = {
  to: '1234567890',
  content: 'Hello iSendPro',
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('should trigger iSendPro API correctly', async () => {
  (axios.post as any).mockResolvedValueOnce({ data: { id: 'abc123' } });

  const smsProvider = new ISendProSmsProvider(mockConfig);
  await smsProvider.sendMessage(mockSMSMessage);

  expect(axios.post).toHaveBeenCalledWith(
    'https://apirest.isendpro.com/cgi-bin/sms',
    expect.any(URLSearchParams),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const params = (axios.post as any).mock.calls[0][1] as URLSearchParams;
  expect(params.get('keyid')).toBe('test-api-key');
  expect(params.get('sms')).toBe('Hello iSendPro');
  expect(params.get('num')).toBe('1234567890');
  expect(params.get('emetteur')).toBe('NOVU');
});

test('should trigger iSendPro API correctly with _passthrough', async () => {
  (axios.post as any).mockResolvedValueOnce({ data: { id: 'abc123' } });

  const smsProvider = new ISendProSmsProvider(mockConfig);
  await smsProvider.sendMessage(mockSMSMessage, {
    _passthrough: {
      body: {
        message: {
          text: 'Hello iSendPro _passthrough',
        },
      },
    },
  });

  expect(axios.post).toHaveBeenCalled();
  const params = (axios.post as any).mock.calls[0][1] as URLSearchParams;
  expect(params.get('sms')).toBe('Hello iSendPro _passthrough');
});
