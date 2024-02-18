import { Novu } from '../novu';
import axios from 'axios';

const mockConfig = {
  apiKey: '1234',
};

const mockedOrganization = {
  _id: '649070af750b25b4ac8a4704',
  __v: 0,
  name: 'Test Organization',
  branding: {
    logo: 'https://s3.us-east-1.amazonaws.com/bucket/key.jpeg',
    color: '#ff5517',
    fontFamily: 'Lato',
  },
  createdAt: '2023-06-19T15:13:51.961Z',
  updatedAt: '2023-06-19T15:13:51.966Z',
};

const mockedMember = {
  _id: '649070af750b25b4ac8a4759',
  memberStatus: 'active',
  _userId: '649070afaa9e50289df420d8',
  roles: ['admin'],
  _organizationId: mockedOrganization._id,
  createdAt: mockedOrganization.createdAt,
  updatedAt: mockedOrganization.createdAt,
  __v: 0,
  id: '649070af750b25b4ac8a4759',
  user: {
    _id: '649070afaa9e50289df420d8',
    firstName: 'john',
    lastName: 'doe',
    email: 'johndoe@example.com',
    profilePicture:
      'https://gravatar.com/avatar/fd876f8cd6a58277fc664d47ea10ad19?d=mp',
    createdAt: '2023-03-07T13:32:54.573Z',
    id: '649070afaa9e50289df420d8',
  },
};

jest.mock('axios');

describe('Novu Node.js package - Organizations class', () => {
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

  it('should list organizations', async () => {
    const mockedResponse = {
      data: [mockedOrganization],
    };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.organizations.list();

    expect(mockedAxios.get).toBeCalled();
    expect(result).toStrictEqual(mockedResponse);
  });

  it('should create new organization', async () => {
    const organizationName = 'New Organization';
    const mockedResponse = {
      data: {
        ...mockedOrganization,
        name: organizationName,
      },
    };
    mockedAxios.post.mockResolvedValue(mockedResponse);

    const payload = { name: organizationName };
    const result = await novu.organizations.create(payload);

    expect(mockedAxios.post).toBeCalledWith('/organizations', payload);
    expect(result).toStrictEqual(mockedResponse);
  });

  it('should rename current organization', async () => {
    const newName = 'Renamed Organization';
    const mockedResponse = {
      data: {
        name: newName,
      },
    };
    mockedAxios.patch.mockResolvedValue(mockedResponse);

    const payload = { name: newName };
    const result = await novu.organizations.rename(payload);

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.patch).toBeCalledWith('/organizations', payload);
  });

  it('should fetch current organization', async () => {
    const mockedResponse = { data: mockedOrganization };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.organizations.getCurrent();

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.get).toBeCalledWith('/organizations/me');
  });

  it('should remove member from current organization', async () => {
    const mockedResponse = { data: mockedMember };
    mockedAxios.delete.mockResolvedValue(mockedResponse);

    const result = await novu.organizations.removeMember(mockedMember.id);

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.delete).toBeCalledWith(
      `/organizations/members/${mockedMember.id}`
    );
  });

  it('should update member role in current organization', async () => {
    const mockedResponse = { data: mockedMember };
    mockedAxios.put.mockResolvedValue(mockedResponse);

    const payload = { role: 'admin' };
    const result = await novu.organizations.updateMemberRole(
      mockedMember.id,
      payload
    );

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.put).toBeCalledWith(
      `/organizations/members/${mockedMember.id}/roles`,
      payload
    );
  });

  it('should fetch all members of current organization', async () => {
    const mockedResponse = { data: [mockedMember] };
    mockedAxios.get.mockResolvedValue(mockedResponse);

    const result = await novu.organizations.getMembers();

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.get).toBeCalledWith('/organizations/members');
  });

  it('should update branding details of current organization', async () => {
    const payload = {
      logo: 'https://s3.us-east-1.amazonaws.com/bucket/key.jpeg',
      color: '#000000',
      fontFamily: 'Lato',
    };
    const mockedResponse = { data: payload };
    mockedAxios.put.mockResolvedValue(mockedResponse);

    const result = await novu.organizations.updateBranding(payload);

    expect(result).toStrictEqual(mockedResponse);
    expect(mockedAxios.put).toBeCalledWith('/organizations/branding', payload);
  });
});
