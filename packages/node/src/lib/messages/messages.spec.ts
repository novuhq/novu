import { ChannelTypeEnum } from '@novu/shared';
import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('Novu Node.js package - Messages class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  const methods = ['get', 'post', 'put', 'delete', 'patch'];

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  afterEach(() => {
    methods.forEach((method) => {
      mockedAxios[method].mockClear();
    });
  });

  test('should delete message by messageId', async () => {
    const messageId = 'messageId';

    const mockedResponse = {
      data: { acknowledged: true, status: 'deleted' },
    };
    mockedAxios.delete.mockResolvedValue(mockedResponse);

    const result = await novu.messages.deleteById(messageId);

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(`/messages/${messageId}`);
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should list messages with filter', async () => {
    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize: 10,
        hasMore: false,
        page: 0,
        data: [
          {
            cta: [Object],
            _id: '649070afaa9e50289df42134',
            _templateId: '649070af750b25b4ac8a4746',
            _environmentId: '649070af750b25b4ac8a470a',
            _messageTemplateId: '649070af750b25b4ac8a4743',
            _notificationId: '649070afaa9e50289df420d8',
            _organizationId: '649070af750b25b4ac8a4704',
            _subscriberId: '649070af750b25b4ac8a4759',
            _jobId: '649070afaa9e50289df420db',
            templateIdentifier:
              'test-event-bbb3413a-14de-4e55-9fe1-37ee53ff359f',
            email: 'new-test-email@gmail.com',
            subject: 'Password reset',
            channel: 'email',
            providerId: 'sendgrid',
            deviceTokens: [],
            seen: false,
            read: false,
            status: 'sent',
            transactionId: '4560c0e0-7512-492d-8966-c708546aeb7e',
            payload: [Object],
            expireAt: '2023-07-19T15:13:51.961Z',
            deleted: false,
            createdAt: '2023-06-19T15:13:51.961Z',
            updatedAt: '2023-06-19T15:13:51.966Z',
            __v: 0,
            content: [Array],
            subscriber: [Object],
            actorSubscriber: 'actorSubscriberId',
            id: '649070afaa9e50289df42134',
          },
        ],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.messages.list({
      page: 1,
      limit: 5,
      channel: ChannelTypeEnum.EMAIL,
      transactionIds: ['transactionId1', 'transactionId2'],
    });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/messages', {
      params: {
        page: 1,
        limit: 5,
        channel: 'email',
        transactionId: ['transactionId1', 'transactionId2'],
      },
    });
    expect(result).toBe(mockedResponse);
  });
});
