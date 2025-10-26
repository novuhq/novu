import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';

describe('Get Context - /contexts/:type/:id (GET) #novu-v2', () => {
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

  afterEach(async () => {
    await contextRepository.delete({
      _environmentId: session.environment._id,
    });
  });

  after(() => {
    // @ts-expect-error process.env is not typed
    delete process.env.IS_CONTEXT_ENABLED;
  });

  it('should get a newly created context', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'get-test-org-acme',
      key: 'tenant:get-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const getContextResult = await getContext({ session, type: 'tenant', id: 'get-test-org-acme' });

    expect(getContextResult.data.type).to.equal('tenant');
    expect(getContextResult.data.id).to.equal('get-test-org-acme');
    expect(getContextResult.data.data).to.deep.equal({ tenantName: 'Acme Corp', region: 'us-east-1' });
    expect(getContextResult.data.createdAt).to.be.ok;
    expect(getContextResult.data.updatedAt).to.be.ok;
  });

  it('should get a context with empty data', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'get-test-workspace-123',
      key: 'workspace:get-test-workspace-123',
      data: {},
    });

    const getContextResult = await getContext({ session, type: 'workspace', id: 'get-test-workspace-123' });

    expect(getContextResult.data.type).to.equal('workspace');
    expect(getContextResult.data.id).to.equal('get-test-workspace-123');
    expect(getContextResult.data.data).to.deep.equal({});
  });

  it('should throw exception if context does not exist', async () => {
    const incorrectType = 'tenant';
    const incorrectId = 'non-existent';

    try {
      await getContext({ session, type: incorrectType, id: incorrectId });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(404);
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Context with id '${incorrectId}' and type '${incorrectType}' not found in environment ${session.environment._id}`
      );
    }
  });
});

async function getContext({ session, type, id }: { session; type: string; id: string }) {
  const axiosInstance = axios.create();

  return (
    await axiosInstance.get(`${session.serverUrl}/v2/contexts/${type}/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    })
  ).data;
}
