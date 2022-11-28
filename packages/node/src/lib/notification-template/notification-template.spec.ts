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

  test('should create a template with the given parameters', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.create({
      name: 'test1',
      notificationGroupId: 'NOTIFGROUPID',
      steps: [],
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/notification-templates', {
      name: 'test1',
      notificationGroupId: 'NOTIFGROUPID',
      steps: [],
    });
  });

  test('should update the given template', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.notificationTemplates.update('TEMPLATE_ID', {
      name: 'exactly like suggested',
      tags: ['mb', 'mickey'],
      description: 'new working package',
      notificationGroupId: 'NOTIFGROUPID',
      steps: [],
    });

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/notification-templates/TEMPLATE_ID',
      {
        name: 'exactly like suggested',
        tags: ['mb', 'mickey'],
        description: 'new working package',
        steps: [],
        notificationGroupId: 'NOTIFGROUPID',
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
