const sendMailMock = jest.fn().mockReturnValue(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
});

jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    }),
  };
});

import nodemailer from 'nodemailer';
import { NodemailerProvider } from './nodemailer.provider';
import { ConnectionOptions } from 'tls';
import { fail } from 'assert';

const buffer = Buffer.from('test');
const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: buffer, name: 'test.txt' }],
  from: 'test@test.com',
};

afterEach(() => {
  sendMailMock.mockReset();
});

describe('Config is set to secure=false but not user and password set', () => {
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
      name: config.host,
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: undefined,
      dkim: undefined,
      ignoreTls: undefined,
      requireTls: undefined,
    });
  });
});

describe('Config is set to secure=false (default; TLS used if server supports STARTTLS extension', () => {
  const mockConfig = {
    host: 'test.test.email',
    port: 587,
    secure: false,
    from: 'test@test.com',
    senderName: 'John Doe',
    user: 'test@test.com',
    password: 'test123',
  };

  test('should trigger nodemailer correctly', async () => {
    const provider = new NodemailerProvider(mockConfig);
    await provider.sendMessage(mockNovuMessage);

    expect(sendMailMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith({
      from: { address: mockNovuMessage.from, name: mockConfig.senderName },
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
  });

  test('should check provider integration correctly', async () => {
    const provider = new NodemailerProvider(mockConfig);
    const response = await provider.checkIntegration(mockNovuMessage);

    expect(sendMailMock).toHaveBeenCalled();
    expect(response.success).toBe(true);

    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      name: mockConfig.host,
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
});

describe('Config is set to secure=true and TLS options are provided', () => {
  const mockConfig = {
    host: 'test.test.email',
    port: 587,
    secure: true,
    from: 'test@test.com',
    senderName: 'John Doe',
    user: 'test@test.com',
    password: 'test123',
    tlsOptions: {
      rejectUnauthorized: false,
    },
  };

  test('should trigger nodemailer correctly', async () => {
    const provider = new NodemailerProvider(mockConfig);
    await provider.sendMessage(mockNovuMessage);

    expect(sendMailMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith({
      from: { address: mockNovuMessage.from, name: mockConfig.senderName },
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
  });

  test('should check provider integration correctly', async () => {
    const provider = new NodemailerProvider(mockConfig);
    const response = await provider.checkIntegration(mockNovuMessage);

    expect(sendMailMock).toHaveBeenCalled();
    expect(response.success).toBe(true);
  });

  test('should throw an error if TLS options are not a valid JSON', () => {
    try {
      const provider = new NodemailerProvider({
        ...mockConfig,
        tlsOptions: (() => {}) as unknown as ConnectionOptions,
      });
      fail('Should not reach here');
    } catch (error) {
      expect(error.message).toBe(
        'TLS options is not a valid JSON. Check again the value set for NODEMAILER_TLS_OPTIONS'
      );
    }
  });
});
