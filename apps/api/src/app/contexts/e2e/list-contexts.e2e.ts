import { Novu } from '@novu/api';
import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('List Contexts - /contexts (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const contextRepository = new ContextRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
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

    const response = await novuClient.contexts.list({});

    expect(response.result.data).to.be.an('array');
    expect(response.result.data.length).to.equal(5);
    expect(response.result.data[0].id).to.equal('list-test-1-org-4');
    expect(response.result.data[4].id).to.equal('list-test-1-org-0');
    expect(response.result.totalCount).to.equal(5);
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

    const response = await novuClient.contexts.list({ type: 'tenant' });

    expect(response.result.data.length).to.equal(2);
    expect(response.result.data.every((ctx) => ctx.type === 'tenant')).to.be.true;
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

    const response = await novuClient.contexts.list({ id: 'list-test-3-org-acme' });

    expect(response.result.data.length).to.equal(2);
    expect(response.result.data.every((ctx) => ctx.id === 'list-test-3-org-acme')).to.be.true;
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

    const response = await novuClient.contexts.list({ search: 'acme' });

    expect(response.result.data.length).to.equal(2);
  });

  it('should handle regex metacharacters in search without crashing', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'list-test-regex-org-1',
      key: 'tenant:list-test-regex-org-1',
      data: {},
    });

    const response = await novuClient.contexts.list({ search: '[invalid' });

    expect(response.result.data).to.be.an('array');
    expect(response.result.data.length).to.equal(0);
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

    const page1 = await novuClient.contexts.list({ limit: 5 });

    expect(page1.result.data.length).to.equal(5);
    expect(page1.result.next).to.be.ok;
    expect(page1.result.totalCount).to.equal(15);

    const page2 = await novuClient.contexts.list({ limit: 5, after: page1.result.next ?? undefined });

    expect(page2.result.data.length).to.equal(5);
    expect(page2.result.next).to.be.ok;
    expect(page2.result.previous).to.be.ok;

    const page3 = await novuClient.contexts.list({ limit: 5, after: page2.result.next ?? undefined });

    expect(page3.result.data.length).to.equal(5);
    expect(page3.result.previous).to.be.ok;
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

    const responseDesc = await novuClient.contexts.list({ orderBy: 'createdAt', orderDirection: 'DESC' });

    expect(responseDesc.result.data[0].id).to.equal('list-test-6-org-3');
    expect(responseDesc.result.data[2].id).to.equal('list-test-6-org-1');

    const responseAsc = await novuClient.contexts.list({ orderBy: 'createdAt', orderDirection: 'ASC' });

    expect(responseAsc.result.data[0].id).to.equal('list-test-6-org-1');
    expect(responseAsc.result.data[2].id).to.equal('list-test-6-org-3');
  });

  it('should return empty list when no contexts exist', async () => {
    const response = await novuClient.contexts.list({});

    expect(response.result.data).to.be.an('array');
    expect(response.result.data.length).to.equal(0);
    expect(response.result.totalCount).to.equal(0);
  });
});

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
