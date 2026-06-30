import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ValueFirstSmsProvider } from './valuefirst.provider';

let provider: ValueFirstSmsProvider;

beforeEach(() => {
  provider = new ValueFirstSmsProvider({
    user: 'test-user',
    password: 'test-password',
    from: 'TestSender',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  (ValueFirstSmsProvider as any).tokenCache.clear();
});

describe('ValueFirstSmsProvider', () => {
  test('should trigger token generation and send SMS correctly', async () => {
    const tokenResponse = { token: 'test-bearer-token' };
    const smsResponse = `<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE MESSAGE SYSTEM "https://api.myvfirst.com/psms/dtd/messagev12.dtd">
<MESSAGEACK>
<GUID GUID="h5ng551155313946013uw3" SUBMITDATE="2017-05-10 09:59:49" ID="1"/>
</MESSAGEACK>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(tokenResponse)),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
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
          Authorization: 'Basic dGVzdC11c2VyOnRlc3QtcGFzc3dvcmQ=',
        }),
      })
    );

    const smsCallArgs = fetchMock.mock.calls[1][1] as { body: string };
    expect(smsCallArgs.body).toContain('<USER />');
    expect(smsCallArgs.body).toContain('<SMS UDH="0" TEXT="Test message" CODING="1" PROPERTY="0" ID="919876543210"');
    expect(smsCallArgs.body).toContain('<ADDRESS FROM="TestSender" TO="919876543210" ');
    expect(smsCallArgs.body).toContain('/>');
    expect(smsCallArgs.body).toContain('<DLR>YES</DLR>');

    expect(result.id).toBe('h5ng551155313946013uw3');
    expect(result.date).toBeDefined();
  });

  test('should reuse cached token before expiry', async () => {
    const tokenResponse = { token: 'cached-token' };
    const smsResponse = `<?xml version="1.0" encoding="ISO-8859-1"?>
<MESSAGEACK>
<GUID GUID="msg-999" SUBMITDATE="2017-05-10 09:59:49" ID="1"/>
</MESSAGEACK>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(tokenResponse)) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(smsResponse) })
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(smsResponse) });
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
    const tokenResponse = { token: 'test-token' };
    const errorResponse = `<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE MESSAGE SYSTEM "https://api.myvfirst.com/psms/dtd/messagev12.dtd">
<MESSAGEACK>
<GUID GUID="err-msg" SUBMITDATE="2017-05-10 09:59:49" ID="1">
<ERROR SEQ="2" CODE="28682"/>
</GUID>
</MESSAGEACK>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(tokenResponse)) })
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(errorResponse) });
    global.fetch = fetchMock;

    await expect(provider.sendMessage({ content: 'Test', to: '+919876543210' })).rejects.toThrow(
      'ValueFirst error codes: 28682'
    );
  });

  test('should throw on token endpoint HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Bad credentials'),
    });
    global.fetch = fetchMock;

    await expect(provider.sendMessage({ content: 'Test', to: '+919876543210' })).rejects.toThrow(
      'ValueFirst token request failed: 401 Unauthorized. Bad credentials'
    );
  });

  test('should throw on SMS endpoint HTTP error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify({ token: 't' })) })
      .mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });
    global.fetch = fetchMock;

    await expect(provider.sendMessage({ content: 'Test', to: '+919876543210' })).rejects.toThrow(
      'ValueFirst SMS request failed: 500 Internal Server Error. Server error'
    );
  });

  test('should send SMS with _passthrough DLT fields', async () => {
    const tokenResponse = { token: 'passthrough-token' };
    const smsResponse = `<?xml version="1.0" encoding="ISO-8859-1"?>
<MESSAGEACK>
<GUID GUID="777" SUBMITDATE="2017-05-10 09:59:49" ID="1"/>
</MESSAGEACK>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(tokenResponse)) })
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(smsResponse) });
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
    expect(smsCallArgs.body).toContain('DLTTEMPLATEID="1234567890123456789"');
    expect(smsCallArgs.body).toContain('ENTITYID="9876543210987654321"');
    expect(smsCallArgs.body).toContain('DLTCONTENTTYPE="3"');
    expect(smsCallArgs.body).toContain('HEADERID="HEADER123"');
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
      const result = provider.parseEventBody({ id: 'msg-1', status_error: '8449', msg_status: 'Delivered' }, 'msg-1');
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
      const result = provider.parseEventBody({ message_id: 'ext-123', msg_status: 'Delivered' }, 'ext-123');
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
    const tokenResponse = { token: 'xml-test-token' };
    const smsResponse = `<?xml version="1.0" encoding="ISO-8859-1"?>
<MESSAGEACK>
<GUID GUID="888" SUBMITDATE="2017-05-10 09:59:49" ID="1"/>
</MESSAGEACK>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(tokenResponse)) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(smsResponse) });
    global.fetch = fetchMock;

    await provider.sendMessage({
      content: 'Hello & goodbye <test>',
      to: '+919876543210',
    });

    const smsCallArgs = fetchMock.mock.calls[1][1] as { body: string };
    expect(smsCallArgs.body).toContain('Hello &amp; goodbye &lt;test&gt;');
  });
});
