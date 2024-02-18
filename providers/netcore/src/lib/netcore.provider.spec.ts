// eslint-disable-next-line import/first
import { NetCoreProvider } from './netcore.provider';
import axios from 'axios';
import { IEmailBody } from 'netcore';
import { IEmailOptions } from '@novu/stateless';

jest.mock('axios');

const mockConfig = {
  apiKey: 'test-key',
  from: 'netcore',
  senderName: "Novu's Team",
};

const mockEmailOptions: IEmailOptions = {
  html: '<div> Mail Content </div>',
  subject: 'test subject',
  from: 'test@test1.com',
  to: ['test@to.com'],
  cc: ['test@cc.com'],
  bcc: ['test@bcc.com'],
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

const mockNovuMessage: IEmailBody = {
  from: { email: mockEmailOptions.from },
  subject: mockEmailOptions.subject,
  content: [{ type: 'html', value: mockEmailOptions.html }],
  personalizations: [
    {
      bcc: mockEmailOptions.bcc.map((email) => ({ email })),
      to: mockEmailOptions.to.map((email) => ({ email })),
      cc: mockEmailOptions.cc.map((email) => ({ email })),
      attachments: mockEmailOptions.attachments.map((attachment) => {
        return {
          content: attachment.file.toString('base64'),
          name: attachment.name,
        };
      }),
    },
  ],
};

describe('test netcore email send api', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
  });

  test('should trigger email correctly', async () => {
    const response = {
      data: {
        data: {
          message_id: 'fa6cb2977cdfd457b3ac98be710ad763',
        },
        message: 'OK',
        status: 'success',
      },
    };

    mockedAxios.request.mockResolvedValue(response);

    const netCoreProvider = new NetCoreProvider(mockConfig);

    const spy = jest.spyOn(netCoreProvider, 'sendMessage');

    const res = await netCoreProvider.sendMessage(mockEmailOptions);

    expect(mockedAxios.request).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    expect(spy).toBeCalledWith(mockEmailOptions);
    expect(res.id).toEqual(response.data.data.message_id);
  });
});
