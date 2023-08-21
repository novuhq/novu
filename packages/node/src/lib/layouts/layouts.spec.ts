import axios from 'axios';

import { OrderDirectionEnum, TemplateVariableTypeEnum } from '@novu/shared';

import { Novu } from '../novu';

const mockConfig = {
  apiKey: '1234',
};

jest.mock('axios');

const layoutId = 'layoutId';
const name = 'layout-name';
const identifier = 'layout-identifier';
const description = 'layout-description';
const content =
  '<html><body><div>Hello {{organizationName}} {{{body}}}</div></body></html>';
const variables = [
  {
    name: 'organizationName',
    type: TemplateVariableTypeEnum.STRING,
    defaultValue: 'Company',
    required: false,
  },
];
const isDefault = false;

const layoutDto = {
  _id: layoutId,
  _environmentId: 'environment-id',
  _organizationId: 'organization-id',
  _creatorId: 'user-id',
  channel: 'email',
  name,
  identifier,
  description,
  contentType: 'customHtml',
  isDefault,
  isDeleted: false,
  createdAt: '2022-08-01 01:00:00',
  updatedAt: '2022-08-01 01:00:00',
};

describe('Novu Node.js package - Layouts class', () => {
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

  test('should create layout', async () => {
    const mockedResponse = {
      data: {
        _id: layoutId,
      },
    };
    mockedAxios.post.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.create({
      name,
      identifier,
      description,
      content,
      variables,
      isDefault,
    });

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith('/layouts', {
      name,
      identifier,
      description,
      content,
      variables,
      isDefault,
    });
    expect(result).toBe(mockedResponse);
  });

  test('should delete layout', async () => {
    mockedAxios.delete.mockResolvedValue({});

    const result = await novu.layouts.delete(layoutId);

    expect(mockedAxios.delete).toHaveBeenCalled();
    expect(mockedAxios.delete).toHaveBeenCalledWith(`/layouts/${layoutId}`);
    expect(result).toStrictEqual({});
  });

  test('should get layout by the id', async () => {
    const mockedResponse = {
      data: {
        ...layoutDto,
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.get(layoutId);

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/layouts', {
      params: { layoutId },
    });
    expect(result).toStrictEqual(mockedResponse);
  });

  test('should list layouts', async () => {
    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize: 10,
        page: 0,
        data: [layoutDto],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.list({ page: 0 });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/layouts', {
      params: { page: 0 },
    });
    expect(result).toBe(mockedResponse);
  });

  test('should list layouts with selected pageSize', async () => {
    const pageSize = 20;

    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize,
        page: 0,
        data: [layoutDto],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.list({ page: 0, pageSize });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/layouts', {
      params: { page: 0, pageSize },
    });

    expect(result).toBe(mockedResponse);
  });

  test('should list layouts with selected query params', async () => {
    const pageSize = 20;
    const orderBy = OrderDirectionEnum.DESC;
    const sortBy = 'createdAt';

    const mockedResponse = {
      data: {
        totalCount: 1,
        pageSize,
        page: 0,
        data: [layoutDto],
      },
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.list({
      page: 0,
      pageSize,
      orderBy: OrderDirectionEnum.DESC,
      sortBy: 'createdAt',
    });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalledWith('/layouts', {
      params: { page: 0, pageSize, orderBy: -1, sortBy: 'createdAt' },
    });

    expect(result).toBe(mockedResponse);
  });

  test('should set layout as default', async () => {
    mockedAxios.post.mockResolvedValue({});

    const result = await novu.layouts.setDefault(layoutId);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `/layouts/${layoutId}/default`
    );
    expect(result).toStrictEqual({});
  });

  test('should update layout', async () => {
    const newDescription = 'updated-description';
    const newName = 'updatedName';
    const newIsDefault = true;

    const mockedResponse = {
      data: {
        ...layoutDto,
        name: newName,
        description: newDescription,
        isDefault: newIsDefault,
      },
    };
    mockedAxios.patch.mockResolvedValue(mockedResponse);

    const result = await novu.layouts.update(layoutId, {
      name: newName,
      description: newDescription,
      isDefault: newIsDefault,
    });

    expect(mockedAxios.patch).toHaveBeenCalled();
    expect(mockedAxios.patch).toHaveBeenCalledWith(`/layouts/${layoutId}`, {
      name: newName,
      description: newDescription,
      isDefault: newIsDefault,
    });
    expect(result).toBe(mockedResponse);
  });
});
