import type { ISMSRecipient } from 'africastalking';
import { AfricasTalkingSmsProvider } from './africas-talking.provider';

test('should trigger africas-talking library correctly', async () => {
  const provider = new AfricasTalkingSmsProvider({
    apiKey: 'c76857ddd8f003d015c4username171fe823c78db1c8960eca7',
    username: 'sandbox',
    from: 'Frica',
  });
  const response = {
    messageId: 'sername171fe823c78db1c8960eca',
    statusCode: 101,
    number: '+23391361338469',
    cost: 'KES 1.01',
    status: 'Success' as ISMSRecipient['status'],
  };

  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .spyOn(provider.africasTalkingClient.SMS, 'send')
    .mockImplementation(async () => {
      return {
        SMSMessageData: {
          Recipients: [response],
          Message: 'SMS Sent.',
        },
      };
    });

  const payload = {
    to: '+23391361338469',
    content: 'SMS Content',
  };

  await provider.sendMessage(payload);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    from: 'Frica',
    message: payload.content,
    to: payload.to,
  });
});
