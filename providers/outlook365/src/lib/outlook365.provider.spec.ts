const sendMailMock = jest.fn().mockReturnValue(() => {
  return {} as any;
});

const checkIntegrationMock = jest.fn().mockReturnValue(() => {
  return {} as any;
});

import { Outlook365Provider } from './outlook365.provider';

jest.mock('./outlook365.provider', () => ({
  get Outlook365Provider() {
    return jest.fn().mockImplementation(function () {
      return {
        sendMessage: sendMailMock,
        checkIntegration: checkIntegrationMock,
      };
    });
  },
}));

const mockConfig = {
  from: 'test@test.com',
  senderName: 'test@test.com',
  password: 'test123',
};

const buffer = Buffer.from('test');

const mockNovuMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: buffer, name: 'test.txt' }],
};

test('should trigger outlook365 library correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);
  await provider.sendMessage(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith(mockNovuMessage);
});

test('should check provider integration correctly', async () => {
  const provider = new Outlook365Provider(mockConfig);
  const response = await provider.checkIntegration(mockNovuMessage);

  expect(checkIntegrationMock).toHaveBeenCalled();
  expect(checkIntegrationMock).toHaveBeenCalledWith(mockNovuMessage);
});
