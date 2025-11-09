import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

describe('Update Context - /contexts/:type/:id (PATCH) #novu-v2', () => {
  let session: UserSession;
  const contextRepository = new ContextRepository();

  before(() => {
    (process.env as Record<string, string>).IS_CONTEXT_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(async () => {
    await contextRepository.delete({
      _environmentId: session.environment._id,
    });
  });

  after(() => {
    delete (process.env as Record<string, string>).IS_CONTEXT_ENABLED;
  });

  it('should update context data', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-1',
      key: 'tenant:update-test-org-1',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const response = await updateContext({
      session,
      type: 'tenant',
      id: 'update-test-org-1',
      data: { tenantName: 'Acme Corporation', region: 'us-west-2', settings: { theme: 'dark' } },
    });

    expect(response?.status).to.equal(200);

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-1',
    });

    expect(updatedContext?.data).to.deep.equal({
      tenantName: 'Acme Corporation',
      region: 'us-west-2',
      settings: { theme: 'dark' },
    });
  });

  it('should replace context data completely', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-2',
      key: 'tenant:update-test-org-2',
      data: { tenantName: 'Acme Corp', region: 'us-east-1', oldField: 'value' },
    });

    const response = await updateContext({
      session,
      type: 'tenant',
      id: 'update-test-org-2',
      data: { newField: 'newValue' },
    });

    expect(response?.status).to.equal(200);

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-2',
    });

    expect(updatedContext?.data).to.deep.equal({ newField: 'newValue' });
    expect(updatedContext?.data).to.not.have.property('oldField');
  });

  it('should update context data to empty object', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-3',
      key: 'tenant:update-test-org-3',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const response = await updateContext({
      session,
      type: 'tenant',
      id: 'update-test-org-3',
      data: {},
    });

    expect(response?.status).to.equal(200);

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-3',
    });

    expect(updatedContext?.data).to.deep.equal({});
  });

  it('should throw exception if context does not exist', async () => {
    try {
      await updateContext({
        session,
        type: 'tenant',
        id: 'non-existent',
        data: { test: 'value' },
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(404);
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Context with type 'tenant' and id 'non-existent' not found`
      );
    }
  });

  it('should throw error if data is missing', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-4',
      key: 'tenant:update-test-org-4',
      data: { tenantName: 'Acme Corp' },
    });

    try {
      await updateContext({
        session,
        type: 'tenant',
        id: 'update-test-org-4',
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(422);
    }
  });
});

// biome-ignore lint/suspicious/noExportsInTest: helper function used by other tests
export async function updateContext({
  session,
  type,
  id,
  data,
}: {
  session;
  type?: string;
  id?: string;
  data?: any;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.patch(
    `${session.serverUrl}/v2/contexts/${type}/${id}`,
    {
      data,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
