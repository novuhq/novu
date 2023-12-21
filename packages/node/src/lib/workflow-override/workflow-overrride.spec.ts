import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

describe('test use of novus node package - Workflow overrride class', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let novu: Novu;

  beforeEach(() => {
    mockedAxios.create.mockReturnThis();
    novu = new Novu(mockConfig.apiKey);
  });

  test('should fetch all the worker-overrides correctly', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getWorkflowOverrides();

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 0,
        limit: 10,
      },
    });
  });

  test('should fetch all the workflow-overrides correctly of 2nd page', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getWorkflowOverrides(2);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 2,
        limit: 10,
      },
    });
  });

  test('should fetch all the workflow-overrides correctly with limit of 15', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getWorkflowOverrides(0, 15);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 0,
        limit: 15,
      },
    });
  });

  test('should fetch all the workflow-overrides correctly of page 3 with limit of 20', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getWorkflowOverrides(3, 20);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 3,
        limit: 20,
      },
    });
  });

  test('should create a workflow override with the given parameters', async () => {
    mockedAxios.post.mockResolvedValue({});

    const result = await novu.workflowoverrides.create({
      workflowId: '8329rufivdsnvs9u334',
      tenantId: 'wvnq340i2jfwqv392',
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/workflow-overrides', {
      workflowId: '8329rufivdsnvs9u334',
      tenantId: 'wvnq340i2jfwqv392',
    });
  });

  test('should update the given workflow override', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.updateWorkflowOverride(
      'OVERRIDE_ID',
      'TENANT_ID',
      {
        active: false,
      }
    );

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/workflow-overrides/workflows/OVERRIDE_ID/tenants/TENANT_ID',
      {
        active: false,
      }
    );
  });

  test('should delete the specified override id', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.delete('OVERRIDE_ID1');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      '/workflow-overrides/OVERRIDE_ID1'
    );
  });

  test('should fetch the workflow-overide with the given override id', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getworkflowOverrideById('OVERRIDE_ID');

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/workflow-overrides/OVERRIDE_ID'
    );
  });

  test('should fetch the workflow-overide with the given tenant id', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.getWorkflowOverride(
      'WORKFLOW_ID',
      'TENANT_ID'
    );

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/workflow-overrides/workflows/WORKFLOW_ID/tenants/TENANT_ID'
    );
  });

  test('should update the workflow override by id', async () => {
    mockedAxios.post.mockResolvedValue({});

    await novu.workflowoverrides.updateWorkflowOverrideById('OVERRIDE_ID', {
      active: false,
    });

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/workflow-overrides/OVERRIDE_ID',
      {
        active: false,
      }
    );
  });
});
