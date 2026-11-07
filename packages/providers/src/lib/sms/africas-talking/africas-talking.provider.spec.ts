import { SmsProviderIdEnum } from '@novu/shared';
import { expect, test, vi } from 'vitest';
import { AfricasTalkingSmsProvider } from './africas-talking.provider';

test('should expose the provider id', () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  expect(provider.id).toBe(SmsProviderIdEnum.AfricasTalking);
});

test(`should trigger Africa's Talking library correctly`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  const spy = vi.spyOn((provider as any).africasTalkingClient, 'send').mockImplementation(async () => {
    return {
      SMSMessageData: {
        Message: 'Sent to 1/1 Total Cost: KES 0.8000',
        Recipients: [{ status: 'Success', statusCode: 101, number: '+2347063317344', messageId: 'ATXid_1' }],
      },
    };
  });

  await provider.sendMessage({
    to: '+2347063317344',
    content: 'SMS Content',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+2347063317344',
    from: '1234',
    message: 'SMS Content',
  });
});

test(`should trigger Africa's Talking library correctly with _passthrough`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  const spy = vi.spyOn((provider as any).africasTalkingClient, 'send').mockImplementation(async () => {
    return {
      SMSMessageData: {
        Message: 'Sent to 1/1 Total Cost: KES 0.8000',
        Recipients: [{ status: 'Success', statusCode: 101, number: '+2347063317344', messageId: 'ATXid_1' }],
      },
    };
  });

  await provider.sendMessage(
    {
      to: '+2347063317344',
      content: 'SMS Content',
    },
    {
      _passthrough: {
        body: {
          to: '+3347063317344',
        },
      },
    }
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+3347063317344',
    from: '1234',
    message: 'SMS Content',
  });
});

test(`should return the Africa's Talking message id`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  vi.spyOn((provider as any).africasTalkingClient, 'send').mockResolvedValue({
    SMSMessageData: {
      Message: 'Sent to 1/1 Total Cost: KES 0.8000',
      Recipients: [{ status: 'Success', statusCode: 101, number: '+2347063317344', messageId: 'ATXid_1' }],
    },
  });

  const result = await provider.sendMessage({
    to: '+2347063317344',
    content: 'SMS Content',
  });

  expect(result.id).toBe('ATXid_1');
});

test(`should not throw when Africa's Talking queues the message`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  vi.spyOn((provider as any).africasTalkingClient, 'send').mockResolvedValue({
    SMSMessageData: {
      Message: 'Sent to 1/1 Total Cost: KES 0.8000',
      Recipients: [{ status: 'Queued', statusCode: 102, number: '+2347063317344', messageId: 'ATXid_2' }],
    },
  });

  const result = await provider.sendMessage({
    to: '+2347063317344',
    content: 'SMS Content',
  });

  expect(result.id).toBe('ATXid_2');
});

test(`should throw when Africa's Talking rejects the recipient`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  vi.spyOn((provider as any).africasTalkingClient, 'send').mockResolvedValue({
    SMSMessageData: {
      Message: 'Sent to 0/1 Total Cost: 0',
      Recipients: [{ status: 'InvalidPhoneNumber', statusCode: 403, number: '+2340000', messageId: 'None' }],
    },
  });

  await expect(
    provider.sendMessage({
      to: '+2340000',
      content: 'SMS Content',
    })
  ).rejects.toThrow("Africa's Talking error: InvalidPhoneNumber");
});

test(`should throw when Africa's Talking returns no recipients`, async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'b664b089f04b72c56ac3b0a8ffbb6f3d18a82eb40c29d17b49b84433439fb127',
    username: 'sandbox',
    from: '1234',
  });

  vi.spyOn((provider as any).africasTalkingClient, 'send').mockResolvedValue({
    SMSMessageData: { Message: 'InvalidSenderId', Recipients: [] },
  });

  await expect(
    provider.sendMessage({
      to: '+2347063317344',
      content: 'SMS Content',
    })
  ).rejects.toThrow("Africa's Talking error: InvalidSenderId");
});
