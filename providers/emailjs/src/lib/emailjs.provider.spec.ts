const mockResponse = { header: { 'message-id': 'message-id', date: 'date' } };
const sendAsyncMock = jest.fn().mockResolvedValue(mockResponse);
const SMTPClientMock = jest.fn().mockImplementation(() => {
  return { sendAsync: sendAsyncMock };
});
const MessageMock = jest.fn().mockImplementation((hash) => hash);

import { EmailJsProvider } from './emailjs.provider';

jest.mock('emailjs', () => {
  return {
    SMTPClient: SMTPClientMock,
    Message: MessageMock,
  };
});

test('should trigger emailjs correctly', async () => {
  const provider = new EmailJsProvider({
    from: 'test@test.com',
    host: 'test.test.email',
    user: 'test@test.com',
    password: 'test123',
    port: 587,
    secure: false,
  });

  const response = await provider.sendMessage({
    to: 'test@test2.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    text: 'Mail content',
  });

  expect(SMTPClientMock).toHaveBeenCalled();
  expect(SMTPClientMock).toHaveBeenCalledWith({
    host: 'test.test.email',
    user: 'test@test.com',
    password: 'test123',
    port: 587,
    ssl: false,
  });
  expect(MessageMock).toHaveBeenCalled();
  expect(MessageMock).toHaveBeenCalledWith({
    from: 'test@test.com',
    to: 'test@test2.com',
    subject: 'test subject',
    text: 'Mail content',
    attachment: { data: '<div> Mail Content </div>', alternative: true },
  });
  expect(sendAsyncMock).toHaveBeenCalled();
  expect(sendAsyncMock).toHaveBeenCalledWith({
    from: 'test@test.com',
    to: 'test@test2.com',
    subject: 'test subject',
    text: 'Mail content',
    attachment: { data: '<div> Mail Content </div>', alternative: true },
  });
  expect(response).toEqual({
    id: mockResponse.header['message-id'],
    date: mockResponse.header.date,
  });
});
