import fetch from 'jest-fetch-mock';
import { SmsmodeSmsProvider } from './smsmode.provider';
import { ISmsOptions, SmsEventStatusEnum } from '@novu/stateless';
import { objectToEqual } from './objectToEqual';

const mockConfig = {
  apiKey: 'TCl080Y3xyQqU1kgRL29BX9TkAlUG8uk',
  from: '1234',
};

fetch.enableMocks();

expect.extend({
  objectToEqual,
});

const mockNovuMessage: ISmsOptions = {
  from: '5678',
  to: '+33623456789',
  content: 'SMS content',
};

const mockSMSModeResponse = {
  messageId: '67c15045-1067-4588-ba3c-737cc5051438',
  acceptedAt: '2021-10-14T12:00:00',
  channel: {
    channelId: 'cbc76dcd-72a8-43ee-a39f-acba2157e81c',
    name: 'marketing_channel',
    type: 'SMS',
    flow: 'MARKETING',
  },
  type: 'SMS',
  direction: 'MT',
  recipient: {
    to: '3600000000',
  },
  from: '36034',
  body: {
    text: 'message',
    encoding: 'GSM7',
    messagePartCount: 1,
    length: 7,
  },
  status: {
    deliveryDate: '2021-10-14T12:00:00',
    value: 'ENROUTE',
  },
  href: 'https://rest.smsmode.com/sms/v1/messages/67c15045-1067-4588-ba3c-737cc5051438',
};

beforeEach(() => {
  fetch.doMock();
});

afterEach(() => {
  fetch.resetMocks();
});

describe('sendMessage method', () => {
  test('should call smsmode API send message endpoint once', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch).toBeCalled();
  });

  test('should call smsmode API send message endpoint with right URL', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://rest.smsmode.com/sms/v1/messages'
    );
  });

  test('should call smsmode API send message endpoint using POST method', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: 'POST',
    });
  });

  test('should call smsmode API using config apiKey', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      headers: {
        'x-api-key': mockConfig.apiKey,
      },
    });
  });

  test('should send message with provided config from', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    const { from, ...mockNovuMessageWithoutFrom } = mockNovuMessage;

    await provider.sendMessage(mockNovuMessageWithoutFrom);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('from', mockConfig.from),
    });
  });

  test('should send message with provided option from overriding config from', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('from', mockNovuMessage.from),
    });
  });
  test('should send message with provided option to', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('recipient.to', mockNovuMessage.to),
    });
  });
  test('should send message with provided option content', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fetch.mock.calls[0][1]).toMatchObject({
      body: expect.objectToEqual('body.text', mockNovuMessage.content),
    });
  });
  test('should return id returned in request response', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      id: mockSMSModeResponse.messageId,
    });
  });
  test('should return date returned in request response', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    fetch.mockResponseOnce(JSON.stringify(mockSMSModeResponse), {
      status: 201,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      date: mockSMSModeResponse.acceptedAt,
    });
  });
});
