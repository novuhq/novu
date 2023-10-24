import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - Events', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should trigger correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.trigger('test-template', {
      to: 'test-user',
      payload: {
        email: 'test-user@sd.com',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: 'test-user',
      overrides: {},
      payload: {
        email: 'test-user@sd.com',
      },
    });
  });

  test('should broadcast correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.broadcast('test-template', {
      payload: {
        email: 'test-user@sd.com',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger/broadcast', {
      name: 'test-template',
      overrides: {},
      payload: {
        email: 'test-user@sd.com',
      },
    });
  });

  test('should pass overrides to request', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.trigger('test-template', {
      to: ['test-user', 'test-another-user'],
      payload: {
        organizationName: 'Company',
      },
      overrides: {
        fcm: {
          type: 'notification',
          data: {
            test: 'test-data',
          },
        },
        email: {
          customData: {
            templateId: 'template-id-123',
            nestedObject: {
              firstChild: {
                secondChild: {
                  name: 'Second Child',
                },
              },
            },
            fourthChild: {
              name: 'Fourth Child',
            },
          },
        },
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: ['test-user', 'test-another-user'],
      overrides: {
        fcm: {
          type: 'notification',
          data: {
            test: 'test-data',
          },
        },
        email: {
          customData: {
            templateId: 'template-id-123',
            nestedObject: {
              firstChild: {
                secondChild: {
                  name: 'Second Child',
                },
              },
            },
            fourthChild: {
              name: 'Fourth Child',
            },
          },
        },
      },
      payload: {
        organizationName: 'Company',
      },
    });
  });

  test('should pass layout identifier overrides to request', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.trigger('test-template', {
      to: ['test-user', 'test-another-user'],
      payload: {
        organizationName: 'Company',
      },
      overrides: {
        layoutIdentifier: 'overrides-identifier',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: ['test-user', 'test-another-user'],
      overrides: {
        layoutIdentifier: 'overrides-identifier',
      },
      payload: {
        organizationName: 'Company',
      },
    });
  });

  test('should trigger correctly for all subscribers definitions ', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.trigger('test-template', {
      to: ['test-user', 'test-another-user'],
      payload: {
        organizationName: 'Company',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: ['test-user', 'test-another-user'],
      overrides: {},
      payload: {
        organizationName: 'Company',
      },
    });

    await novu.events.trigger('test-template', {
      to: [
        { subscriberId: 'test-user', firstName: 'test' },
        { subscriberId: 'test-another-user' },
      ],
      payload: {
        organizationName: 'Company',
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger', {
      name: 'test-template',
      to: [
        { subscriberId: 'test-user', firstName: 'test' },
        { subscriberId: 'test-another-user' },
      ],
      overrides: {},
      payload: {
        organizationName: 'Company',
      },
    });
  });

  test('should cancel correctly', async () => {
    mockedAxios.delete.mockResolvedValue({});

    await novu.events.cancel('transactionId');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      '/events/trigger/transactionId'
    );
  });

  test('should bulk trigger correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.events.bulkTrigger([
      {
        name: 'test-template-1',
        to: 'test-user',
        payload: {
          email: 'test-user@sd.com',
        },
      },

      {
        name: 'test-template-2',
        to: 'test-user',
        payload: {
          email: 'test-user@sd.com',
        },
      },
    ]);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/events/trigger/bulk', {
      events: [
        {
          name: 'test-template-1',
          to: 'test-user',
          payload: {
            email: 'test-user@sd.com',
          },
        },

        {
          name: 'test-template-2',
          to: 'test-user',
          payload: {
            email: 'test-user@sd.com',
          },
        },
      ],
    });
  });
});
