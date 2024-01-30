import fetch from 'jest-fetch-mock';
import { BrevoSmsProvider } from './brevo-sms.provider';
import { ISmsOptions, SmsEventStatusEnum } from '@novu/stateless';
import { objectToEqual } from './objectToEqual';
import { dateIsValid } from './dateIsValid';

const mockConfig = {
  apiKey: 'ABCDE',
  from: 'My Company',
};

fetch.enableMocks();

expect.extend({
  objectToEqual,
  dateIsValid,
});

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
  fetch.doMock();
});

afterEach(() => {
  fetch.resetMocks();
});

describe('sendMessage method', () => {
  test('should call brevo API transactional sms endpoint once', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch).toBeCalled();
  });

  test('should call brevo API transactional sms endpoint with right URL', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.brevo.com/v3/transactionalSMS/sms'
    );
  });

  test('should call brevo API transactional sms endpoint using POST method', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: 'POST',
    });
  });

  test('should call brevo API using config apiKey', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      headers: {
        'api-key': mockConfig.apiKey,
      },
    });
  });

  test('should send message with provided config from', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    const { from, ...mockNovuMessageWithoutFrom } = mockNovuMessage;

    await provider.sendMessage(mockNovuMessageWithoutFrom);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('sender', mockConfig.from),
    });
  });

  test('should send message with provided option from overriding config from', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('sender', mockNovuMessage.from),
    });
  });
  test('should send message with provided option to', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('recipient', mockNovuMessage.to),
    });
  });
  test('should send message with provided option content', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('content', mockNovuMessage.content),
    });
  });
  test('should return id returned in request response', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      id: mockBrevoResponse.messageId,
    });
  });
  test('should return date returned in request response', async () => {
    const provider = new BrevoSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockBrevoResponse), {
      status: 201,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      date: expect.dateIsValid(),
    });
  });
});
