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
    const mockedResponse = {
      data: {
        hasMore: false,
        data: [],
        pageSize: 10,
        page: 0,
      },
    };

    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.list();
    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 0,
        limit: 10,
      },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should fetch all the workflow-overrides correctly of 2nd page', async () => {
    const mockedResponse = {
      data: {
        hasMore: false,
        data: [],
        pageSize: 10,
        page: 2,
      },
    };

    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.list(2);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 2,
        limit: 10,
      },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should fetch all the workflow-overrides correctly with limit of 15', async () => {
    const mockedResponse = {
      data: {
        hasMore: false,
        data: [],
        pageSize: 15,
        page: 0,
      },
    };

    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.list(0, 15);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 0,
        limit: 15,
      },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should fetch all the workflow-overrides correctly of page 3 with limit of 20', async () => {
    const mockedResponse = {
      data: {
        hasMore: false,
        data: [],
        pageSize: 20,
        page: 3,
      },
    };

    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.list(3, 20);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/workflow-overrides', {
      params: {
        page: 3,
        limit: 20,
      },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should create a workflow override with the given parameters', async () => {
    const mockedResponse = {
      _id: '_id',
      _organizationId: '_organizationId',
      _environmentId: '_environmentId',
      _workflowId: 'workflow_id_123',
      _tenantId: 'tenant_id_abc',
      active: false,
      preferenceSettings: {},
      deleted: true,
      deletedAt: 'deletedAt',
      deletedBy: 'deletedBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    mockedAxios.post.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.create({
      workflowId: 'workflow_id_123',
      tenantId: 'tenant_id_abc',
      active: false,
      preferenceSettings: {
        email: false,
        sms: false,
        in_app: false,
        chat: true,
        push: false,
      },
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/workflow-overrides', {
      workflowId: 'workflow_id_123',
      tenantId: 'tenant_id_abc',
      active: false,
      preferenceSettings: {
        email: false,
        sms: false,
        in_app: false,
        chat: true,
        push: false,
      },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should update the given workflow override', async () => {
    const mockedResponse = {
      _id: '_id',
      _organizationId: '_organizationId',
      _environmentId: '_environmentId',
      _workflowId: 'WORKFLOW_ID',
      _tenantId: 'TENANT_ID',
      active: false,
      preferenceSettings: {},
      deleted: true,
      deletedAt: 'deletedAt',
      deletedBy: 'deletedBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    mockedAxios.put.mockResolvedValue(mockedResponse);

    const result =
      await novu.workflowOverrides.updateOneByTenantIdandWorkflowId(
        'WORKFLOW_ID',
        'TENANT_ID',
        {
          active: true,
        }
      );

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/workflow-overrides/workflows/WORKFLOW_ID/tenants/TENANT_ID',
      {
        active: true,
      }
    );
    expect(result).toBe(mockedResponse);
  });

  test('should delete the workflow override by specified override id', async () => {
    const mockedResponse = true;
    mockedAxios.delete.mockResolvedValue(mockedResponse);

    await novu.workflowOverrides.create({
      workflowId: 'workflow_id_123',
      tenantId: 'tenant_id_abc',
      active: false,
      preferenceSettings: {
        email: false,
        sms: false,
        in_app: false,
        chat: true,
        push: false,
      },
    });

    const result = await novu.workflowOverrides.delete('workflow_id_123');

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      `/workflow-overrides/workflow_id_123`
    );

    expect(result).toBe(mockedResponse);
  });

  test('should fetch the workflow-overide with the given override id', async () => {
    const mockedResponse = {
      _id: '_id',
      _organizationId: '_organizationId',
      _environmentId: '_environmentId',
      _workflowId: 'WORKFLOW_ID',
      _tenantId: 'TENANT_ID',
      active: false,
      preferenceSettings: {},
      deleted: true,
      deletedAt: 'deletedAt',
      deletedBy: 'deletedBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.getOneById('OVERRIDE_ID');

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/workflow-overrides/OVERRIDE_ID'
    );
    expect(result).toBe(mockedResponse);
  });

  test('should fetch the workflow-overide with the given tenant id', async () => {
    const mockedResponse = {
      _id: '_id',
      _organizationId: '_organizationId',
      _environmentId: '_environmentId',
      _workflowId: 'WORKFLOW_ID',
      _tenantId: 'TENANT_ID',
      active: false,
      preferenceSettings: {},
      deleted: true,
      deletedAt: 'deletedAt',
      deletedBy: 'deletedBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.getOneByTenantIdandWorkflowId(
      'WORKFLOW_ID',
      'TENANT_ID'
    );

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/workflow-overrides/workflows/WORKFLOW_ID/tenants/TENANT_ID'
    );
    expect(result).toBe(mockedResponse);
  });

  test('should update the workflow override by id', async () => {
    const mockedResponse = {
      _id: '_id',
      _organizationId: '_organizationId',
      _environmentId: '_environmentId',
      _workflowId: 'WORKFLOW_ID',
      _tenantId: 'TENANT_ID',
      active: false,
      preferenceSettings: {},
      deleted: true,
      deletedAt: 'deletedAt',
      deletedBy: 'deletedBy',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    mockedAxios.put.mockResolvedValue(mockedResponse);

    const result = await novu.workflowOverrides.updateOneById('OVERRIDE_ID', {
      active: false,
    });

    expect(mockedAxios.put).toHaveBeenCalled();
    expect(mockedAxios.put).toHaveBeenCalledWith(
      '/workflow-overrides/OVERRIDE_ID',
      {
        active: false,
      }
    );
    expect(result).toBe(mockedResponse);
  });
});
