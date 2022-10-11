import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - NotificationTemplates class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should fetch all the notification-templates correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.getAll(undefined, 0);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/notification-templates', {
      params: {
        limit: 0,
      },
    });
  });

  test('should apply one change', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.create('test1', 'NOTIFGROUPID');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/notification-templates', {
      name: 'test1',
      notificationGroupId: 'NOTIFGROUPID',
    });
  });

  test('should update the given template', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.update(
      'TEMPLATE_ID',
      'exactly like suggested',
      {
        tags: ['mb', 'mickey'],
        description: 'new working package',
      }
    );

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/notification-templates/TEMPLATE_ID',
      {
        name: 'exactly like suggested',
        tags: ['mb', 'mickey'],
        description: 'new working package',
      }
    );
  });

  test('should delete the specified template', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.delete('TEMPLATE_ID');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      '/notification-templates/TEMPLATE_ID'
    );
  });

  test('should fetch the template with the given templateId', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.getOne('TEMPLATE_ID');

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/notification-templates/TEMPLATE_ID'
    );
  });

  test('should update the status of the specified template', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.updateStatus('TEMPLATE_ID', false);

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/notification-templates/TEMPLATE_ID/status',
      {
        active: false,
      }
    );
  });
});
