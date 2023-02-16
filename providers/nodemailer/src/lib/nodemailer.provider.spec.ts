const sendMailMock = jest.fn().mockReturnValue(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
});

// eslint-disable-next-line import/first
import { NodemailerProvider } from './nodemailer.provider';

jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    }),
  };
});

import nodemailer from 'nodemailer';

const mockConfig = {
  host: 'test.test.email',
  port: 587,
  secure: false,
  from: 'test@test.com',
  user: 'test@test.com',
  password: 'test123',
};

const buffer = Buffer.from('test');
const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: buffer, name: 'test.txt' }],
};

test('should trigger nodemailer correctly', async () => {
  const provider = new NodemailerProvider(mockConfig);
  await provider.sendMessage(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(sendMailMock).toHaveBeenCalledWith({
    from: mockConfig.from,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    to: mockNovuMessage.to,
    attachments: [
      {
        contentType: 'text/plain',
        content: buffer,
        filename: 'test.txt',
      },
    ],
  });

  expect(nodemailer.createTransport).toHaveBeenCalled();
  expect(nodemailer.createTransport).toHaveBeenCalledWith({
    host: mockConfig.host,
    port: mockConfig.port,
    secure: mockConfig.secure,
    auth: {
      user: mockConfig.user,
      pass: mockConfig.password,
    },
    dkim: undefined,
    tls: undefined,
  });
});

test('should trigger nodemailer without auth with rejectUnauthorized as false', async () => {
  const config = {
    host: 'test.test.email',
    port: 587,
    secure: false,
    from: 'test@test.com',
    user: undefined,
    password: undefined,
  };
  const provider = new NodemailerProvider(config);
  await provider.sendMessage(mockNovuMessage);

  expect(nodemailer.createTransport).toHaveBeenCalled();
  expect(nodemailer.createTransport).toHaveBeenCalledWith({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: undefined,
    dkim: undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
});

test('should check provider integration correctly', async () => {
  const provider = new NodemailerProvider(mockConfig);
  const response = await provider.checkIntegration(mockNovuMessage);

  expect(sendMailMock).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
