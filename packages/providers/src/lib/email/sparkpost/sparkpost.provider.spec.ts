import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SparkPostEmailProvider } from './sparkpost.provider';

const mockConfig = {
  apiKey:
    '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',
  region: undefined,
  from: 'test@test.com',
  senderName: 'test',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

test('should trigger sendinblue library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      results: {
        id: 'id',
      },
    },
  });
  const provider = new SparkPostEmailProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith(
    '/transmissions',
    {
      content: {
        attachments: [
          { data: 'ZEdWemRBPT0=', name: 'test.txt', type: 'text/plain' },
        ],
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
        Authorization:
          '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',
        'Content-Type': 'application/json',
      },
    },
  );
});

test('should trigger sendinblue library correctly with _passthrough', async () => {
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

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith(
    '/transmissions',
    {
      content: {
        attachments: [
          { data: 'ZEdWemRBPT0=', name: 'test.txt', type: 'text/plain' },
        ],
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
        Authorization:
          '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',
        'Content-Type': 'application/json',
      },
    },
  );
});
