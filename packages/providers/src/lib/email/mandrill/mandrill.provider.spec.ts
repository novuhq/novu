import { expect, test, vi } from 'vitest';
import { MandrillProvider } from './mandrill.provider';

const mockConfig = {
  apiKey: 'API_KEY',
  from: 'test@test.com',
  senderName: 'Test Sender',
};

test('should send a standard email through Mandrill', async () => {
  const provider = new MandrillProvider(mockConfig);
  const spy = vi.spyOn(provider['transporter'].messages, 'send').mockImplementation(async () => {
    return [{}] as any;
  });

  const mockNovuMessage = {
    to: ['test2@test.com'],
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    attachments: [
      {
        mime: 'text/plain',
        file: Buffer.from('test'),
        name: 'test.txt',
      },
    ],
  };

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    message: {
      from_email: mockConfig.from,
      from_name: mockConfig.senderName,
      subject: mockNovuMessage.subject,
      html: mockNovuMessage.html,
      to: [{ email: mockNovuMessage.to[0], type: 'to' }],
      attachments: [
        {
          content: Buffer.from('test').toString('base64'),
          type: 'text/plain',
          name: 'test.txt',
        },
      ],
    },
  });
});

test('should send an email using a Mandrill template', async () => {
  const provider = new MandrillProvider(mockConfig);
  const spy = vi.spyOn(provider['transporter'].messages, 'sendTemplate').mockImplementation(async () => {
    return [{}] as any;
  });

  const mockNovuMessage = {
    to: ['test2@test.com'],
    subject: 'test subject',
    html: undefined,
    customData: {
      templateId: 'welcome-template',
      variables: {
        FIRST_NAME: 'John',
        LAST_NAME: 'Doe',
      },
    },
  };

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    template_name: mockNovuMessage.customData.templateId,
    template_content: [],
    message: {
      from_email: mockConfig.from,
      from_name: mockConfig.senderName,
      subject: mockNovuMessage.subject,
      html: mockNovuMessage.html,
      to: [{ email: mockNovuMessage.to[0], type: 'to' }],
      global_merge_vars: [
        { name: 'FIRST_NAME', content: 'John' },
        { name: 'LAST_NAME', content: 'Doe' },
      ],
    },
  });
});

test('should trigger mandrill correctly with _passthrough', async () => {
  const provider = new MandrillProvider(mockConfig);
  const spy = vi.spyOn(provider['transporter'].messages, 'send').mockImplementation(async () => {
    return [{}] as any;
  });
  const mockNovuMessage = {
    to: ['test2@test.com'],
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    attachments: [
      {
        mime: 'text/plain',
        file: Buffer.from('test'),
        name: 'test.txt',
      },
    ],
  };

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        message: {
          from_email: 'hello@test.com',
        },
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    message: {
      from_email: 'hello@test.com',
      from_name: mockConfig.senderName,
      subject: mockNovuMessage.subject,
      html: mockNovuMessage.html,
      to: [
        {
          email: mockNovuMessage.to[0],
          type: 'to',
        },
      ],
      attachments: [
        {
          content: Buffer.from('test').toString('base64'),
          type: 'text/plain',
          name: 'test.txt',
        },
      ],
    },
  });
});

test('should check provider integration correctly', async () => {
  const provider = new MandrillProvider(mockConfig);
  const spy = vi.spyOn(provider['transporter'].users, 'ping').mockImplementation(async () => {
    return 'PONG!';
  });

  const response = await provider.checkIntegration();
  expect(spy).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
