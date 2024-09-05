import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ISmsOptions } from '@novu/stateless';
import { BrevoSmsProvider } from './brevo-sms.provider';

const mockConfig = {
  apiKey: 'ABCDE',
  from: 'My Company',
};

const mockNovuMessage: ISmsOptions = {
  from: 'My Company',
  to: '+33623456789',
  content: 'SMS content',
};

const mockBrevoResponse = {
  reference: 'brevo-reference',
  messageId: 1511882900176220,
  smsCount: 2,
  usedCredits: 0.7,
  remainingCredits: 82.85,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendMessage method', () => {
  test('should call brevo API transactional sms endpoint once', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    expect(fetchMock).toBeCalled();
  });

  test('should call brevo API transactional sms endpoint with right URL', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    expect(fetchMock.mock.calls[0][0]).toEqual(
      'https://api.brevo.com/v3/transactionalSMS/sms',
    );
  });

  test('should call brevo API transactional sms endpoint using POST method', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
    });
  });

  test('should call brevo API using config apiKey', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: {
        'api-key': mockConfig.apiKey,
      },
    });
  });

  test('should send message with provided config from', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    const { from, ...mockNovuMessageWithoutFrom } = mockNovuMessage;

    await provider.sendMessage(mockNovuMessageWithoutFrom);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.sender).toEqual(mockConfig.from);
  });

  test('should send message with provided option from overriding config from', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.sender).toEqual(mockNovuMessage.from);
  });

  test('should send message with provided option to', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.recipient).toEqual(mockNovuMessage.to);
  });

  test('should send message with provided option content', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.content).toEqual(mockNovuMessage.content);
  });

  test('should send message with provided option content with _passthrough', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    await provider.sendMessage(mockNovuMessage, {
      _passthrough: {
        body: {
          content: '_passthrough content',
        },
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.content).toEqual('_passthrough content');
  });

  test('should return id returned in request response', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      id: mockBrevoResponse.messageId,
    });
  });

  test('should return date returned in request response', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockBrevoResponse),
      status: 201,
    });
    global.fetch = fetchMock;

    const result = await provider.sendMessage(mockNovuMessage);

    expect(new Date(result.date).toString()).not.toEqual('Invalid Date');
  });
});
