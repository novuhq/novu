import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { expect } from 'chai';

describe('Delete Context - /contexts/:type/:id (DELETE) #novu-v2', () => {
  let session: UserSession;
  const contextRepository = new ContextRepository();

  before(() => {
    (process.env as Record<string, string>).IS_CONTEXT_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  after(() => {
    delete (process.env as Record<string, string>).IS_CONTEXT_ENABLED;
  });

  it('should delete newly created context', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
      key: 'tenant:delete-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const existingContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
    });

    expect(existingContext).to.be.ok;

    const response = await deleteContext({
      session,
      type: 'tenant',
      id: 'delete-test-org-acme',
    });

    expect(response.status).to.equal(204);

    const deletedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
    });

    expect(deletedContext).to.equal(null);
  });

  it('should throw exception while trying to delete non-existing context', async () => {
    const type = 'tenant';
    const id = 'non-existent-context';

    try {
      await deleteContext({
        session,
        type,
        id,
      });

      throw new Error('Should not succeed');
    } catch (e) {
      expect(e.response.status).to.equal(404);
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Context with id '${id}' and type '${type}' not found in environment ${session.environment._id}`
      );
    }
  });
});

// biome-ignore lint/suspicious/noExportsInTest: helper function used by other tests
export async function deleteContext({
  session,
  type,
  id,
}: {
  session;
  type?: string;
  id?: string;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.delete(`${session.serverUrl}/v2/contexts/${type}/${id}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
