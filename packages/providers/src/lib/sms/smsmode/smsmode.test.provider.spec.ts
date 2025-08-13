import { ISmsOptions } from '@novu/stateless';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ISmsmodeApiResponse, SmsmodeSmsProvider } from './smsmode.provider';

test('should trigger smsmode library correctly', async () => {});

const mockConfig = {
  apiKey: 'ABCDE',
  from: 'My Company',
};

const mockNovuMessage: ISmsOptions = {
  from: 'My Company',
  to: '+33623456789',
  content: 'SMS content',
};

const mockSmsmodeApiResponse: ISmsmodeApiResponse = {
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
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendMessage method', () => {
  test('should call smsmode API sms endpoint once with POST method', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fakePost).toHaveBeenCalled();
  });

  test('should call smsmode API endpoint with right URL', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fakePost.mock.calls[0][0]).toEqual('https://rest.smsmode.com/sms/v1/messages');
  });

  test('should call smsmode API using config apiKey', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    expect(fakePost.mock.calls[0][2]).toMatchObject({
      headers: {
        'X-Api-Key': mockConfig.apiKey,
      },
    });
  });

  test('should send message with provided config from', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    const { from, ...mockNovuMessageWithoutFrom } = mockNovuMessage;

    await provider.sendMessage(mockNovuMessageWithoutFrom);

    console.log(fakePost.mock.calls);
    const requestBody = fakePost.mock.calls[0][1];

    expect(requestBody.from).toEqual(mockConfig.from);
  });

  test('should send message with provided option from overriding config from', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    const requestBody = fakePost.mock.calls[0][1];

    expect(requestBody.from).toEqual(mockNovuMessage.from);
  });

  test('should send message with provided option to', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    const requestBody = fakePost.mock.calls[0][1];

    expect(requestBody.recipient.to).toEqual(mockNovuMessage.to);
  });

  test('should send message with provided option content', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage);

    const requestBody = fakePost.mock.calls[0][1];

    expect(requestBody.body.text).toEqual(mockNovuMessage.content);
  });

  test('should send message with provided option content with _passthrough', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    const { mockPost: fakePost } = axiosSpy({
      data: '0',
    });

    await provider.sendMessage(mockNovuMessage, {
      _passthrough: {
        body: {
          body: {
            text: '_passthrough content',
          },
        },
      },
    });

    const requestBody = fakePost.mock.calls[0][1];

    expect(requestBody.body.text).toEqual('_passthrough content');
  });

  test('should return id returned in request response', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    axiosSpy({
      data: mockSmsmodeApiResponse,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      id: mockSmsmodeApiResponse.messageId,
    });
  });

  test('should return date returned in request response', async () => {
    const provider = new SmsmodeSmsProvider(mockConfig);

    axiosSpy({
      data: mockSmsmodeApiResponse,
    });

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result).toMatchObject({
      date: mockSmsmodeApiResponse.acceptedAt,
    });
  });
});
