import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

describe('List Contexts - /contexts (GET) #novu-v2', () => {
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

  it('should get the newly created contexts', async () => {
    for (let i = 0; i < 5; i += 1) {
      await contextRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        type: 'tenant',
        id: `list-test-1-org-${i}`,
        key: `tenant:list-test-1-org-${i}`,
        data: { index: i },
      });

      await timeout(5);
    }

    const response = await listContexts({ session });

    expect(response.status).to.equal(200);
    expect(response.data.data).to.be.an('array');
    expect(response.data.data.length).to.equal(5);
    expect(response.data.data[0].id).to.equal('list-test-1-org-4');
    expect(response.data.data[4].id).to.equal('list-test-1-org-0');
    expect(response.data.totalCount).to.equal(5);
  });

  it('should filter contexts by type', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-2-org-1',
      key: 'tenant:list-test-2-org-1',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'list-test-2-workspace-1',
      key: 'workspace:list-test-2-workspace-1',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-2-org-2',
      key: 'tenant:list-test-2-org-2',
      data: {},
    });

    const response = await listContexts({ session, type: 'tenant' });

    expect(response.status).to.equal(200);
    expect(response.data.data.length).to.equal(2);
    expect(response.data.data.every((ctx) => ctx.type === 'tenant')).to.be.true;
  });

  it('should filter contexts by id', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-3-org-acme',
      key: 'tenant:list-test-3-org-acme',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'list-test-3-org-acme',
      key: 'workspace:list-test-3-org-acme',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-3-org-other',
      key: 'tenant:list-test-3-org-other',
      data: {},
    });

    const response = await listContexts({ session, id: 'list-test-3-org-acme' });

    expect(response.status).to.equal(200);
    expect(response.data.data.length).to.equal(2);
    expect(response.data.data.every((ctx) => ctx.id === 'list-test-3-org-acme')).to.be.true;
  });

  it('should search contexts by key pattern', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-4-org-acme',
      key: 'tenant:list-test-4-org-acme',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'list-test-4-workspace-acme',
      key: 'workspace:list-test-4-workspace-acme',
      data: {},
    });

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-4-org-other',
      key: 'tenant:list-test-4-org-other',
      data: {},
    });

    const response = await listContexts({ session, search: 'list-test-4.*acme' });

    expect(response.status).to.equal(200);
    expect(response.data.data.length).to.equal(2);
  });

  it('should support cursor-based pagination with limit', async () => {
    for (let i = 0; i < 15; i += 1) {
      await contextRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        type: 'tenant',
        id: `list-test-5-org-${i}`,
        key: `tenant:list-test-5-org-${i}`,
        data: { index: i },
      });

      await timeout(5);
    }

    const page1 = await listContexts({ session, limit: 5 });

    expect(page1.data.data.length).to.equal(5);
    expect(page1.data.next).to.be.ok;
    expect(page1.data.totalCount).to.equal(15);

    const page2 = await listContexts({ session, limit: 5, after: page1.data.next });

    expect(page2.data.data.length).to.equal(5);
    expect(page2.data.next).to.be.ok;
    expect(page2.data.previous).to.be.ok;

    const page3 = await listContexts({ session, limit: 5, after: page2.data.next });

    expect(page3.data.data.length).to.equal(5);
    expect(page3.data.previous).to.be.ok;
  });

  it('should support orderBy and orderDirection', async () => {
    await timeout(10);

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-6-org-1',
      key: 'tenant:list-test-6-org-1',
      data: {},
    });

    await timeout(10);

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-6-org-2',
      key: 'tenant:list-test-6-org-2',
      data: {},
    });

    await timeout(10);

    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-6-org-3',
      key: 'tenant:list-test-6-org-3',
      data: {},
    });

    const responseDesc = await listContexts({ session, orderBy: 'createdAt', orderDirection: 'DESC' });

    expect(responseDesc.data.data[0].id).to.equal('list-test-6-org-3');
    expect(responseDesc.data.data[2].id).to.equal('list-test-6-org-1');

    const responseAsc = await listContexts({ session, orderBy: 'createdAt', orderDirection: 'ASC' });

    expect(responseAsc.data.data[0].id).to.equal('list-test-6-org-1');
    expect(responseAsc.data.data[2].id).to.equal('list-test-6-org-3');
  });

  it('should return empty list when no contexts exist', async () => {
    const response = await listContexts({ session });

    expect(response.status).to.equal(200);
    expect(response.data.data).to.be.an('array');
    expect(response.data.data.length).to.equal(0);
    expect(response.data.totalCount).to.equal(0);
  });
});

async function listContexts({
  session,
  limit,
  after,
  before,
  orderBy,
  orderDirection,
  type,
  id,
  search,
}: {
  session;
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: string;
  orderDirection?: string;
  type?: string;
  id?: string;
  search?: string;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();
  const params = new URLSearchParams();

  if (limit) params.append('limit', limit.toString());
  if (after) params.append('after', after);
  if (before) params.append('before', before);
  if (orderBy) params.append('orderBy', orderBy);
  if (orderDirection) params.append('orderDirection', orderDirection);
  if (type) params.append('type', type);
  if (id) params.append('id', id);
  if (search) params.append('search', search);

  const query = params.toString() ? `?${params.toString()}` : '';

  return await axiosInstance.get(`${session.serverUrl}/v2/contexts${query}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}

function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
