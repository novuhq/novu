import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ValueFirstSmsProvider } from './valuefirst.provider';

let provider: ValueFirstSmsProvider;

beforeEach(() => {
  provider = new ValueFirstSmsProvider({
    apiKey: 'test-api-key',
    from: 'TestSender',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ValueFirstSmsProvider', () => {
  test('should trigger token generation and send SMS correctly', async () => {
    const tokenResponse = { token: 'test-bearer-token', expiryDate: '2024-12-31 23:59:59' };
    const smsResponse = `<?xml version="1.0"?>
<MESSAGE>
  <SUCCESS>
    <MOBILENUMBER>+919876543210</MOBILENUMBER>
    <MESSAGEID>h5ng551155313946013uw3</MESSAGEID>
    <TEXT>Test message</TEXT>
  </SUCCESS>
</MESSAGE>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve(tokenResponse),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve(smsResponse),
      });
    global.fetch = fetchMock;

    const result = await provider.sendMessage({
      content: 'Test message',
      to: '+919876543210',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.myvfirst.com/psms/api/messages/token?action=generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'API Key test-api-key',
        }),
      })
    );

    const smsCallArgs = fetchMock.mock.calls[1][1] as { body: string };
    expect(smsCallArgs.body).toContain('<USERNAME>test-api-key</USERNAME>');
    expect(smsCallArgs.body).toContain('<PASSWORD>test-api-key</PASSWORD>');
    expect(smsCallArgs.body).toContain('<TEXT>Test message</TEXT>');
    expect(smsCallArgs.body).toContain('<FROM>TestSender</FROM>');
    expect(smsCallArgs.body).toContain('<TO>+919876543210</TO>');
    expect(smsCallArgs.body).toContain('<ADDRESS>');
    expect(smsCallArgs.body).toContain('<DLR>YES</DLR>');
    expect(smsCallArgs.body).toContain('<SENDER>TestSender</SENDER>');

    expect(result.id).toBe('h5ng551155313946013uw3');
    expect(result.date).toBeDefined();
  });

  test('should reuse cached token before expiry', async () => {
    const tokenResponse = { token: 'cached-token', expiryDate: '2024-12-31 23:59:59' };
    const smsResponse = `<?xml version="1.0"?>
<MESSAGE><SUCCESS><MESSAGEID>msg-999</MESSAGEID></SUCCESS></MESSAGE>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve(tokenResponse),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve(smsResponse),
      })
      .mockResolvedValue({
        text: () => Promise.resolve(smsResponse),
      });
    global.fetch = fetchMock;

    await provider.sendMessage({ content: 'First', to: '+919876543210' });
    await provider.sendMessage({ content: 'Second', to: '+919876543210' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const smsCalls = fetchMock.mock.calls.filter(
      ([url]: [string]) => url === 'https://api.myvfirst.com/psms/servlet/psms.Eservice2'
    );
    expect(smsCalls).toHaveLength(2);
  });

  test('should throw on API error', async () => {
    const tokenResponse = { token: 'test-token', expiryDate: '2024-12-31 23:59:59' };
    const errorResponse = `<?xml version="1.0"?>
<MESSAGE><FAILURE><ERRORCODE>101</ERRORCODE><ERRORDESC>Invalid sender ID</ERRORDESC></FAILURE></MESSAGE>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve(tokenResponse),
      })
      .mockResolvedValue({
        text: () => Promise.resolve(errorResponse),
      });
    global.fetch = fetchMock;

    await expect(
      provider.sendMessage({ content: 'Test', to: '+919876543210' })
    ).rejects.toThrow('Invalid sender ID');
  });

  test('should send SMS with _passthrough DLT fields', async () => {
    const tokenResponse = { token: 'passthrough-token', expiryDate: '2024-12-31 23:59:59' };
    const smsResponse = `<?xml version="1.0"?>
<MESSAGE><SUCCESS><MESSAGEID>777</MESSAGEID></SUCCESS></MESSAGE>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve(tokenResponse),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve(smsResponse),
      });
    global.fetch = fetchMock;

    await provider.sendMessage(
      { content: 'Test', to: '+919876543210' },
      {
        _passthrough: {
          body: {
            dltTemplateId: '1234567890123456789',
            entityId: '9876543210987654321',
            dltContentType: '3',
            headerId: 'HEADER123',
          },
        },
      }
    );

    const smsCallArgs = fetchMock.mock.calls[1][1] as { body: string };
    expect(smsCallArgs.body).toContain('<DLTTEMPLATEID>1234567890123456789</DLTTEMPLATEID>');
    expect(smsCallArgs.body).toContain('<ENTITYID>9876543210987654321</ENTITYID>');
    expect(smsCallArgs.body).toContain('<DLTCONTENTTYPE>3</DLTCONTENTTYPE>');
    expect(smsCallArgs.body).toContain('<HEADERID>HEADER123</HEADERID>');
  });

  describe('parseEventBody', () => {
    test('should map DELIVERED status from msg_status', () => {
      const result = provider.parseEventBody(
        { id: 'msg-1', msg_status: 'Delivered', delivered_date: '2024-01-01 12:00:00' },
        'msg-1'
      );
      expect(result?.status).toBe('delivered');
      expect(result?.externalId).toBe('msg-1');
    });

    test('should prioritize status_error over msg_status', () => {
      const result = provider.parseEventBody(
        { id: 'msg-1', status_error: '8449', msg_status: 'Delivered' },
        'msg-1'
      );
      expect(result?.status).toBe('failed');
    });

    test('should map numeric status_error 8448 as delivered', () => {
      const result = provider.parseEventBody({ id: 'msg-2', status_error: '8448' }, 'msg-2');
      expect(result?.status).toBe('delivered');
    });

    test('should map numeric status_error 8449 as failed', () => {
      const result = provider.parseEventBody({ id: 'msg-3', status_error: '8449' }, 'msg-3');
      expect(result?.status).toBe('failed');
    });

    test('should map message_status 1 as delivered', () => {
      const result = provider.parseEventBody({ id: 'msg-4', message_status: '1' }, 'msg-4');
      expect(result?.status).toBe('delivered');
    });

    test('should map msg_status "Delivered"', () => {
      const result = provider.parseEventBody({ id: 'msg-5', msg_status: 'Delivered' }, 'msg-5');
      expect(result?.status).toBe('delivered');
    });

    test('should map NOT_DELIVERED to undelivered', () => {
      const result = provider.parseEventBody({ id: 'msg-6', msg_status: 'not_delivered' }, 'msg-6');
      expect(result?.status).toBe('undelivered');
    });

    test('should map failed status correctly', () => {
      const result = provider.parseEventBody({ id: 'msg-7', msg_status: 'Failed' }, 'msg-7');
      expect(result?.status).toBe('failed');
    });

    test('should map rejected status correctly', () => {
      const result = provider.parseEventBody({ id: 'msg-8', msg_status: 'REJECTED' }, 'msg-8');
      expect(result?.status).toBe('rejected');
    });

    test('should map queued status correctly', () => {
      const result = provider.parseEventBody({ id: 'msg-9', msg_status: 'Queued' }, 'msg-9');
      expect(result?.status).toBe('queued');
    });

    test('should map sent status correctly', () => {
      const result = provider.parseEventBody({ id: 'msg-10', msg_status: 'Sent' }, 'msg-10');
      expect(result?.status).toBe('sent');
    });

    test('should return undefined for unknown status', () => {
      const result = provider.parseEventBody({ id: 'msg-11', msg_status: 'UNKNOWN' }, 'msg-11');
      expect(result).toBeUndefined();
    });

    test('should return undefined when no matching body in array', () => {
      const result = provider.parseEventBody([{ id: 'msg-1', msg_status: 'DELIVERED' }], 'non-existent');
      expect(result).toBeUndefined();
    });

    test('should match by message_id when id is absent', () => {
      const result = provider.parseEventBody(
        { message_id: 'ext-123', msg_status: 'Delivered' },
        'ext-123'
      );
      expect(result?.status).toBe('delivered');
    });
  });

  describe('getMessageId', () => {
    test('should return IDs from array', () => {
      const ids = provider.getMessageId([{ id: '1' }, { id: '2' }]);
      expect(ids).toEqual(['1', '2']);
    });

    test('should return single ID', () => {
      const ids = provider.getMessageId({ id: 'single-id' });
      expect(ids).toEqual(['single-id']);
    });

    test('should fall back to message_id', () => {
      const ids = provider.getMessageId({ message_id: 'msg-abc' });
      expect(ids).toEqual(['msg-abc']);
    });
  });

  test('should escape XML special characters in message', async () => {
    const tokenResponse = { token: 'xml-test-token', expiryDate: '2024-12-31 23:59:59' };
    const smsResponse = `<?xml version="1.0"?>
<MESSAGE><SUCCESS><MESSAGEID>888</MESSAGEID></SUCCESS></MESSAGE>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve(tokenResponse),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve(smsResponse),
      });
    global.fetch = fetchMock;

    await provider.sendMessage({
      content: 'Hello & goodbye <test>',
      to: '+919876543210',
    });

    const smsCallArgs = fetchMock.mock.calls[1][1] as { body: string };
    expect(smsCallArgs.body).toContain('Hello &amp; goodbye &lt;test&gt;');
  });
});
