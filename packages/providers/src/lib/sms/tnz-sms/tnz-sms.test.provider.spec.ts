import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { TnzSmsProvider } from './tnz-sms.provider';

const mockConfig = {
  authToken: 'dGVzdC1hdXRoLXRva2VuCg==',
};

const mockMessage = {
  to: '+6412345678',
  content: 'Test SMS content',
};

test('should trigger tnz-sms library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      MessageID: 'tnz-message-id-123',
    },
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('sms', {
    MessageData: {
      Message: 'Test SMS content',
      Destinations: [
        {
          Recipient: '+6412345678',
        },
      ],
    },
  });
});

test('should trigger TNZ SMS API correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      MessageID: 'tnz-message-id-456',
    },
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockMessage, {
    __passthrough: {
      body: {
        MessageData: {
          Destinations: [
            {
              Recipient: '+6412345678',
            },
          ],
        },
      },
    },
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('sms', {
    MessageData: {
      Message: 'Test SMS content',
      Destinations: [
        {
          Recipient: '+6412345678',
        },
      ],
    },
    Passthrough: {
      Body: {
        MessageData: {
          Destinations: [
            {
              Recipient: '+6412345678',
            },
          ],
        },
      },
    },
  });
});

test('should include optional TNZ fields from customData', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      MessageID: 'tnz-message-id-789',
    },
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  const messageWithCustomData = {
    ...mockMessage,
    customData: {
      MessageID: 'custom-message-id',
      Reference: 'ref-123',
      WebhookCallbackURL: 'https://example.com/webhook',
      FromNumber: '+6499999999',
      SubAccount: 'test-subaccount',
    },
  };

  await smsProvider.sendMessage(messageWithCustomData);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('sms', {
    MessageData: {
      Message: 'Test SMS content',
      Destinations: [
        {
          Recipient: '+6412345678',
        },
      ],
      MessageID: 'custom-message-id',
      Reference: 'ref-123',
      WebhookCallbackURL: 'https://example.com/webhook',
      FromNumber: '+6499999999',
      SubAccount: 'test-subaccount',
    },
  });
});

test('should ignore undefined customData fields', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      MessageID: 'tnz-message-id-101',
    },
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  const messageWithPartialCustomData = {
    ...mockMessage,
    customData: {
      Reference: 'ref-456',
      WebhookCallbackURL: undefined,
      FromNumber: '+6499999999',
      InvalidField: 'this-should-be-ignored',
    },
  };

  await smsProvider.sendMessage(messageWithPartialCustomData);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('sms', {
    MessageData: {
      Message: 'Test SMS content',
      Destinations: [
        {
          Recipient: '+6412345678',
        },
      ],
      Reference: 'ref-456',
      FromNumber: '+6499999999',
    },
  });
});

test('should return correct response format', async () => {
  const mockResponseData = {
    MessageID: 'tnz-response-id-123',
  };

  const { mockPost: spy } = axiosSpy({
    data: mockResponseData,
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  const result = await smsProvider.sendMessage(mockMessage);

  expect(spy).toHaveBeenCalled();

  expect(result).toEqual({
    id: 'tnz-response-id-123',
    date: expect.any(String),
  });

  expect(new Date(result.date)).toBeInstanceOf(Date);
});

test('should handle customData with all optional fields', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      MessageID: 'tnz-message-id-full',
    },
  });

  const smsProvider = new TnzSmsProvider(mockConfig);

  const base64Sample = 'JVBERi0xLjQKJaqrrK0KNCAwIG9iago8PAovVHlwZSAv...';

  const messageWithAllCustomData = {
    ...mockMessage,
    customData: {
      MessageID: 'custom-msg-id',
      Reference: 'ref-full',
      WebhookCallbackURL: 'https://example.com/webhook',
      WebhookCallbackFormat: 'JSON',
      SendTime: '2024-01-01T12:00:00Z',
      TimeZone: 'Pacific/Auckland',
      SubAccount: 'test-sub',
      Department: 'marketing',
      ChargeCode: 'CHARGE123',
      FromNumber: '+6499999999',
      SMSEmailReply: 'reply@example.com',
      CharacterConversion: true,
      Files: [
        { Name: 'Sample.pdf', Data: base64Sample },
        { Name: 'Sample2.pdf', Data: base64Sample },
      ],
    },
  };

  await smsProvider.sendMessage(messageWithAllCustomData);

  expect(spy).toHaveBeenCalledWith('sms', {
    MessageData: {
      Message: 'Test SMS content',
      Destinations: [
        {
          Recipient: '+6412345678',
        },
      ],
      MessageID: 'custom-msg-id',
      Reference: 'ref-full',
      WebhookCallbackURL: 'https://example.com/webhook',
      WebhookCallbackFormat: 'JSON',
      SendTime: '2024-01-01T12:00:00Z',
      TimeZone: 'Pacific/Auckland',
      SubAccount: 'test-sub',
      Department: 'marketing',
      ChargeCode: 'CHARGE123',
      FromNumber: '+6499999999',
      SMSEmailReply: 'reply@example.com',
      CharacterConversion: true,
      Files: [
        { Name: 'Sample.pdf', Data: base64Sample },
        { Name: 'Sample2.pdf', Data: base64Sample },
      ],
    },
  });
});
