import { SESv2 } from '@aws-sdk/client-sesv2';
import { SESEmailProvider } from './ses.provider';

test('should trigger ses library correctly', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = jest
    .spyOn(SESv2.prototype, 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mockResponse as any;
    });

  const mockConfig = {
    from: 'test@test.com',
    accessKeyId: 'TEST',
    secretAccessKey: 'TEST',
    region: 'test-1',
  };
  const provider = new SESEmailProvider(mockConfig);

  const mockNotifireMessage = {
    to: 'test@test2.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    text: 'Mail content',
  };
  const response = await provider.sendMessage(mockNotifireMessage);

  const expectedSESEmail = {
    Content: {
      Simple: {
        Body: {
          Html: {
            Data: mockNotifireMessage.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: mockNotifireMessage.text,
            Charset: 'UTF-8',
          },
        },
        Subject: {
          Data: mockNotifireMessage.subject,
          Charset: 'UTF-8',
        },
      },
    },
    Destination: {
      ToAddresses: [mockNotifireMessage.to],
    },
    FromEmailAddress: mockConfig.from,
    ReplyToAddresses: [mockConfig.from],
  };

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expectedSESEmail);
  expect(response.id).toEqual(mockResponse.MessageId);
});
