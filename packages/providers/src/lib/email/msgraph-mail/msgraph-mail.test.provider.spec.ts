import { CheckIntegrationResponseEnum } from '@novu/stateless';
import axios from 'axios';
import { expect, test, vi } from 'vitest';
import { MsGraphEmailProvider } from './msgraph-mail.provider';

const mockConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  tenantId: 'test-tenant-id',
  from: 'test@test.com',
  senderName: 'Test Sender',
};

const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  from: 'test@test.com',
  attachments: [{ mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' }],
  id: 'message_id',
};

const getSpy = () => vi.spyOn(axios, 'post').mockImplementation(async (url) => {
    if (url.includes('oauth2/v2.0/token')) {
      return {
        data: {
          access_token: 'mock-access-token',
        },
      };
    }
    if (url.includes('graph.microsoft.com')) {
      return {
        headers: {
          'x-ms-request-id': 'msgraph-message-id',
        },
      };
    }
    return {};
  });

test('should trigger msgraph library correctly', async () => {
  const provider = new MsGraphEmailProvider(mockConfig);
  
  const spy = getSpy();

  const response = await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledTimes(2);
  
  // Verify Graph API request
  expect(spy).toHaveBeenNthCalledWith(2,
    `https://graph.microsoft.com/v1.0/users/${mockConfig.from}/sendMail`,
    expect.objectContaining({
      message: expect.objectContaining({
        subject: mockNovuMessage.subject,
        body: expect.objectContaining({
          contentType: 'HTML',
          content: mockNovuMessage.html,
        }),
        toRecipients: expect.arrayContaining([
          expect.objectContaining({
            emailAddress: expect.objectContaining({
              address: mockNovuMessage.to[0],
            }),
          }),
        ]),
        from: expect.objectContaining({
          emailAddress: expect.objectContaining({
            address: mockNovuMessage.from,
            name: mockConfig.senderName,
          }),
        }),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: mockNovuMessage.attachments[0].name,
            contentType: mockNovuMessage.attachments[0].mime,
            contentBytes: mockNovuMessage.attachments[0].file.toString('base64'),
          }),
        ]),
      }),
      saveToSentItems: true,
    }),
    expect.objectContaining({
      headers: {
        'Authorization': 'Bearer mock-access-token',
        'Content-Type': 'application/json',
      },
    })
  );
  
  expect(response).not.toBeNull();
  expect(response.id).toBe('msgraph-message-id');
  expect(response.date).toBeDefined();
});

test('should trigger msgraph library correctly with _passthrough', async () => {
  const provider = new MsGraphEmailProvider(mockConfig);
  
  const spy = getSpy();

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        html: '<div> Mail Content _passthrough </div>',
        subject: 'test subject _passthrough',
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledTimes(2);
  
  // Verify Graph API request with overridden values
  expect(spy).toHaveBeenNthCalledWith(2,
    'https://graph.microsoft.com/v1.0/users/test@test.com/sendMail',
    expect.objectContaining({
      message: expect.objectContaining({
        subject: 'test subject _passthrough',
        body: expect.objectContaining({
          content: '<div> Mail Content _passthrough </div>',
        }),
      }),
    }),
    expect.any(Object)
  );
});

test('should check provider integration correctly', async () => {
  const provider = new MsGraphEmailProvider(mockConfig);
  
  const spy = getSpy();

  const response = await provider.checkIntegration(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(response).not.toBeNull();
  expect(response.success).toBeTruthy();
  expect(response.message).toBe('Integrated successfully!');
  expect(response.code).toBe(CheckIntegrationResponseEnum.SUCCESS);
});

test('should handle integration check failure', async () => {
  const provider = new MsGraphEmailProvider(mockConfig);
  
  const spy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, config) => {
    if (url.includes('oauth2/v2.0/token')) {
      return {
        data: {
          access_token: 'mock-access-token',
        },
      };
    }
    if (url.includes('graph.microsoft.com')) {
      throw new Error('Graph API Error');
    }
    return {};
  });

  const response = await provider.checkIntegration(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(response).not.toBeNull();
  expect(response.success).toBeFalsy();
  expect(response.message).toBe('Graph API Error');
  expect(response.code).toBe(CheckIntegrationResponseEnum.FAILED);
});

test('should handle OAuth token failure', async () => {
  const provider = new MsGraphEmailProvider(mockConfig);
  
  const spy = vi.spyOn(axios, 'post').mockImplementation(async (url, data, config) => {
    if (url.includes('oauth2/v2.0/token')) {
      throw new Error('OAuth Error');
    }
    return {};
  });

  try {
    await provider.sendMessage(mockNovuMessage);
  } catch (error) {
    expect(error.message).toBe('OAuth Error');
  }

  expect(spy).toHaveBeenCalled();
});
