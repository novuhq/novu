import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

describe('Create Context - /contexts (POST) #novu-v2', () => {
  let session: UserSession;
  const contextRepository = new ContextRepository();

  before(() => {
    // @ts-expect-error process.env is not typed
    process.env.IS_CONTEXT_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  after(() => {
    // @ts-expect-error process.env is not typed
    delete process.env.IS_CONTEXT_ENABLED;
  });

  it('should create a new context', async () => {
    const response = await createContext({
      session,
      type: 'tenant',
      id: 'create-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    expect(response.status).to.equal(201);
    expect(response.data).to.be.ok;

    const createdContext = await contextRepository.findOne({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'create-test-org-acme',
    });

    expect(createdContext?.type).to.equal('tenant');
    expect(createdContext?.id).to.equal('create-test-org-acme');
    expect(createdContext?.data).to.deep.equal({ tenantName: 'Acme Corp', region: 'us-east-1' });
  });

  it('should create a context without data', async () => {
    const response = await createContext({
      session,
      type: 'workspace',
      id: 'create-test-workspace-123',
    });

    expect(response.status).to.equal(201);
    expect(response.data).to.be.ok;

    const createdContext = await contextRepository.findOne({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'create-test-workspace-123',
    });

    expect(createdContext?.type).to.equal('workspace');
    expect(createdContext?.id).to.equal('create-test-workspace-123');
    expect(createdContext?.data).to.deep.equal({});
  });

  it('should throw error if a context already exists', async () => {
    await createContext({
      session,
      type: 'tenant',
      id: 'create-test-duplicate',
      data: { tenantName: 'Acme Corp' },
    });

    try {
      await createContext({
        session,
        type: 'tenant',
        id: 'create-test-duplicate',
        data: { tenantName: 'Acme Corp Updated' },
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(409);
      expect(e.response.data.message).to.contains(
        `Context with type 'tenant' and id 'create-test-duplicate' already exists`
      );
    }
  });

  it('should throw error if type is missing', async () => {
    try {
      await createContext({
        session,
        id: 'org-acme',
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(422);
    }
  });

  it('should throw error if id is missing', async () => {
    try {
      await createContext({
        session,
        type: 'tenant',
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(422);
    }
  });

  it('should throw error if type has invalid format', async () => {
    try {
      await createContext({
        session,
        type: 'Invalid_Type!',
        id: 'create-test-invalid-type',
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(422);
    }
  });

  it('should throw error if id has invalid format', async () => {
    try {
      await createContext({
        session,
        type: 'tenant',
        id: 'Invalid ID!',
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(422);
    }
  });
});

// biome-ignore lint/suspicious/noExportsInTest: helper function used by other tests
export async function createContext({
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

  return await axiosInstance.post(
    `${session.serverUrl}/v2/contexts`,
    {
      type,
      id,
      data,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
