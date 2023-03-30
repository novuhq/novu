import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('Novu Node.js package - Topics class', () => {
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

  test('should create topic', async () => {
    const key = 'topic-key';
    const name = 'topic-name';

    const mockedResponse = {
      data: {
        _id: 'topic-id',
      },
    };
    mockedAxios.post.mockResolvedValue(mockedResponse);

    const result = await novu.topics.create({
      key,
      name,
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/topics', { key, name });
    expect(result).toBe(mockedResponse);
  });

  test('should rename topic', async () => {
    const key = 'topic-key';
    const name = 'topic-renamed';
    const topicId = 'topic-id';

    const data = {
      _id: 'topic-id',
      _environmentId: 'environment-id',
      _organizationId: 'organization-id',
      key,
      name,
      subscribers: ['subscriber-id-1', 'subscriber-id-2'],
    };

    const mockedResponse = {
      data,
    };
    mockedAxios.patch.mockResolvedValue(mockedResponse);

    const result = await novu.topics.rename(key, name);

    expect(mockedAxios.patch).toHaveBeenCalled();
    expect(mockedAxios.patch).toHaveBeenCalledWith(`/topics/${key}`, {
      name,
    });
    expect(result).toBe(mockedResponse);
  });

  test('should delete topic by the key', async () => {
    const key = 'topic-key';

    const mockedResponse = {};
    mockedAxios.delete.mockResolvedValue(mockedResponse);

    const result = await novu.topics.delete(key);

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(`/topics/${key}`);
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should get topic by the key', async () => {
    const key = 'topic-key';
    const name = 'topic-name';
    const topicId = 'topic-id';

    const topic = {
      _id: 'topic-id',
      _environmentId: 'environment-id',
      _organizationId: 'organization-id',
      key,
      name,
      subscribers: ['subscriber-id-1', 'subscriber-id-2'],
    };

    const mockedResponse = {
      data: {
        ...topic,
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.topics.get(key);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(`/topics/${key}`);
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should get topic subscriber by the external subscriber ID', async () => {
    const topicKey = 'topic-key';
    const externalSubscriberId = 'external-subscriber-id';

    const topicSubscriber = {
      _id: 'topic-subscriber-id',
      _environmentId: 'environment-id',
      _organizationId: 'organization-id',
      _subscriberId: 'subscriber-id',
      _topicId: 'topic-id',
      topicKey,
      externalSubscriberId,
    };

    const mockedResponse = {
      data: {
        ...topicSubscriber,
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.topics.getSubscriber(
      topicKey,
      externalSubscriberId
    );

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `/topics/${topicKey}/subscribers/${externalSubscriberId}`
    );
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should list topics', async () => {
    const key = 'topic-key';
    const name = 'topic-name';
    const topicId = 'topic-id';

    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize: 10,
        page: 0,
        data: [
          {
            _id: 'topic-id',
            _environmentId: 'environment-id',
            _organizationId: 'organization-id',
            key,
            name,
            subscribers: ['subscriber-id-1', 'subscriber-id-2'],
          },
        ],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.topics.list({ page: 0 });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/topics', {
      params: { page: 0 },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should list topics with selected pageSize', async () => {
    const key = 'topic-key';
    const name = 'topic-name';
    const topicId = 'topic-id';
    const pageSize = 20;

    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize,
        page: 0,
        data: [
          {
            _id: 'topic-id',
            _environmentId: 'environment-id',
            _organizationId: 'organization-id',
            key,
            name,
            subscribers: ['subscriber-id-1', 'subscriber-id-2'],
          },
        ],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.topics.list({ page: 0, pageSize });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/topics', {
      params: { page: 0, pageSize },
    });

    expect(result).toBe(mockedResponse);
  });

  test('should add subscribers', async () => {
    const topicId = 'topic-id';
    const subscribers = ['subscriber-id-1', 'subscriber-id-2'];

    const mockedResponse = {
      data: {
        succeeded: subscribers,
      },
    };
    mockedAxios.post.mockResolvedValue(mockedResponse);

    const result = await novu.topics.addSubscribers(topicId, { subscribers });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `/topics/${topicId}/subscribers`,
      { subscribers }
    );
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should remove subscribers', async () => {
    const topicId = 'topic-id';
    const subscribers = ['subscriber-id-1', 'subscriber-id-2'];

    mockedAxios.post.mockResolvedValue({});

    const result = await novu.topics.removeSubscribers(topicId, {
      subscribers,
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `/topics/${topicId}/subscribers/removal`,
      { subscribers }
    );
    expect(result).toStrictEqual({});
  });
});
