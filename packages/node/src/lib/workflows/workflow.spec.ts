import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - Workflows class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should fetch all the workflows correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.list();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflows', {
      params: {
        page: 0,
        limit: 10,
      },
    });
  });

  test('should fetch all the workfloes correctly of 2nd page', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.list(2);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflows', {
      params: {
        page: 2,
        limit: 10,
      },
    });
  });

  test('should fetch all the workflows correctly with limit of 15', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.list(0, 15);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflows', {
      params: {
        page: 0,
        limit: 15,
      },
    });
  });

  test('should fetch all the workflows correctly of page 3 with limit of 20', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.list(3, 20);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflows', {
      params: {
        page: 3,
        limit: 20,
      },
    });
  });

  test('should create a workflowe with the given parameters', async () => {
    mockedAxios.post.mockResolvedValue({});

    const result = await novu.workflows.create({
      name: 'test1',
      notificationGroupId: '63b99e83598f5625a96c4b97',
      steps: [],
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/workflows', {
      name: 'test1',
      notificationGroupId: '63b99e83598f5625a96c4b97',
      steps: [],
    });
  });

  test('should update the given workflow', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.update('WORKFLOW_ID', {
      name: 'exactly like suggested',
      tags: ['mb', 'mickey'],
      description: 'new working package',
      notificationGroupId: 'NOTIFGROUPID',
      steps: [],
    });

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith('/workflows/WORKFLOW_ID', {
      name: 'exactly like suggested',
      tags: ['mb', 'mickey'],
      description: 'new working package',
      steps: [],
      notificationGroupId: 'NOTIFGROUPID',
    });
  });

  test('should delete the specified workflow', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.delete('WORKFLOW_ID');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith('/workflows/WORKFLOW_ID');
  });

  test('should fetch the workflow with the given workflowId', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.get('WORKFLOW_ID');

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflows/WORKFLOW_ID');
  });

  test('should update the status of the specified workflow', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflows.updateStatus('WORKFLOW_ID', false);

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/workflows/WORKFLOW_ID/status',
      {
        active: false,
      }
    );
  });
});
