import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SparkPostEmailProvider } from './sparkpost.provider';

const FAKE_SPARKPOST_API_KEY = 'fake-sparkpost-api-key-for-testing-do-not-use-in-production-00000000000000';

const mockConfig = {
  apiKey: FAKE_SPARKPOST_API_KEY,
  region: undefined,
  from: 'test@test.com',
  senderName: 'test',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [{ mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' }],
};

test('should trigger sparkpost library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      results: {
        id: 'id',
      },
    },
  });
  const provider = new SparkPostEmailProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    '/transmissions',
    {
      content: {
        attachments: [{ data: 'ZEdWemRBPT0=', name: 'test.txt', type: 'text/plain' }],
        from: 'test@test.com',
        html: '<div> Mail Content </div>',
        subject: 'Test subject',
        text: undefined,
      },
      recipients: [{ address: 'test@test.com' }],
    },
    {
      baseURL: 'https://api.sparkpost.com/api/v1',
      headers: {
        Authorization: FAKE_SPARKPOST_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
});

test('should forward custom headers inside content.headers', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      results: {
        id: 'id',
      },
    },
  });
  const provider = new SparkPostEmailProvider(mockConfig);

  await provider.sendMessage({
    ...mockNovuMessage,
    headers: {
      'In-Reply-To': '<original-message-id@example.com>',
      References: '<original-message-id@example.com>',
    },
  });

  expect(spy).toHaveBeenCalledWith(
    '/transmissions',
    expect.objectContaining({
      content: expect.objectContaining({
        headers: {
          'In-Reply-To': '<original-message-id@example.com>',
          References: '<original-message-id@example.com>',
        },
      }),
    }),
    expect.anything()
  );
});

test('should trigger sparkpost library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      results: {
        id: 'id',
      },
    },
  });
  const provider = new SparkPostEmailProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        content: {
          subject: 'Test subject _passthrough',
        },
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    '/transmissions',
    {
      content: {
        attachments: [{ data: 'ZEdWemRBPT0=', name: 'test.txt', type: 'text/plain' }],
        from: 'test@test.com',
        html: '<div> Mail Content </div>',
        subject: 'Test subject _passthrough',
        text: undefined,
      },
      recipients: [{ address: 'test@test.com' }],
    },
    {
      baseURL: 'https://api.sparkpost.com/api/v1',
      headers: {
        Authorization: FAKE_SPARKPOST_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
});
