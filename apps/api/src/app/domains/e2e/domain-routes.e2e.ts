import { randomBytes } from 'node:crypto';
import { Novu } from '@novu/api';
import { DomainRouteDtoType } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdk,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Domain Routes API - /v1/domains/:domainId/routes #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  function uniqueDomainName(): string {
    return `e2e-routes-${randomBytes(6).toString('hex')}.example.test`;
  }

  async function createDomain(): Promise<{ _id: string; name: string }> {
    const name = uniqueDomainName();
    const { result } = await novuClient.domains.create({ name });

    return { _id: result._id, name };
  }

  async function createAgent(): Promise<string> {
    const identifier = `e2e-dr-agent-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const res = await session.testAgent.post('/v1/agents').send({
      name: 'E2E Domain Routes Agent',
      identifier,
    });
    expect(res.status).to.equal(201);

    return res.body.data._id as string;
  }

  it('should create a webhook route without destination', async () => {
    const domain = await createDomain();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'support', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    expect(route._id).to.be.a('string');
    expect(route._domainId).to.equal(domain._id);
    expect(route.address).to.equal('support');
    expect(route.type).to.equal('webhook');
    expect(route.destination).to.be.undefined;
  });

  it('should create an agent route with a valid destination', async () => {
    const domain = await createDomain();
    const agentId = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      {
        address: 'agent-inbox',
        type: DomainRouteDtoType.Agent,
        destination: agentId,
      },
      domain._id
    );

    expect(route.destination).to.equal(agentId);
    expect(route.type).to.equal('agent');
  });

  it('should reject agent route without destination (400)', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'no-dest', type: DomainRouteDtoType.Agent }, domain._id)
    );

    expect(error?.statusCode).to.equal(400);
    expect(String(error?.message ?? '')).to.match(/destination/i);
  });

  it('should reject agent route with unknown destination (404)', async () => {
    const domain = await createDomain();
    const fakeAgentId = '507f1f77bcf86cd799439011';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create(
        {
          address: 'bad-agent',
          type: DomainRouteDtoType.Agent,
          destination: fakeAgentId,
        },
        domain._id
      )
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 409 when creating duplicate address and type on the same domain', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'dup', type: DomainRouteDtoType.Webhook }, domain._id);

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'dup', type: DomainRouteDtoType.Webhook }, domain._id)
    );

    expect(error?.statusCode).to.equal(409);
  });

  it('should return 404 when creating a route on a non-existent domain', async () => {
    const fakeDomainId = '507f1f77bcf86cd799439012';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'x', type: DomainRouteDtoType.Webhook }, fakeDomainId)
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should retrieve a domain route by id', async () => {
    const domain = await createDomain();
    const { result: created } = await novuClient.domains.routes.create(
      { address: 'get-me', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    const { result: fetched } = await novuClient.domains.routes.retrieve(domain._id, created._id);

    expect(fetched._id).to.equal(created._id);
    expect(fetched.address).to.equal('get-me');
  });

  it('should return 404 when retrieving a route with wrong domain id', async () => {
    const domainA = await createDomain();
    const domainB = await createDomain();
    const { result: route } = await novuClient.domains.routes.create(
      { address: 'iso', type: DomainRouteDtoType.Webhook },
      domainA._id
    );

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.retrieve(domainB._id, route._id));

    expect(error?.statusCode).to.equal(404);
  });

  it('should list routes for a domain', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'a1', type: DomainRouteDtoType.Webhook }, domain._id);
    await novuClient.domains.routes.create({ address: 'a2', type: DomainRouteDtoType.Webhook }, domain._id);

    const { result } = await novuClient.domains.routes.list({ domainId: domain._id });

    expect(result.data.length).to.be.at.least(2);
    expect(result.data.every((r) => r._domainId === domain._id)).to.equal(true);
    expect(result).to.have.property('totalCount');
  });

  it('should paginate domain routes without overlap', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'p0', type: DomainRouteDtoType.Webhook }, domain._id);
    await novuClient.domains.routes.create({ address: 'p1', type: DomainRouteDtoType.Webhook }, domain._id);
    await novuClient.domains.routes.create({ address: 'p2', type: DomainRouteDtoType.Webhook }, domain._id);

    const limit = 1;
    const first = await novuClient.domains.routes.list({ domainId: domain._id, limit });

    expect(first.result.data.length).to.equal(1);
    expect(first.result.next).to.be.a('string');

    const second = await novuClient.domains.routes.list({
      domainId: domain._id,
      limit,
      after: first.result.next as string,
    });

    const overlap = first.result.data
      .map((r) => r._id)
      .filter((id) => second.result.data.map((r) => r._id).includes(id));

    expect(overlap.length).to.equal(0);
  });

  it('should return 404 when listing routes for a non-existent domain', async () => {
    const fakeId = '507f1f77bcf86cd799439013';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.list({ domainId: fakeId }));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 400 when listing routes with both before and after cursors', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.list({
        domainId: domain._id,
        before: '000000000000000000000001',
        after: '000000000000000000000002',
      })
    );

    expect(error?.statusCode).to.equal(400);
    expect(String(error?.message ?? '')).to.match(/both.*after/i);
  });

  it('should list routes for the environment via listForEnvironment', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'env-wide', type: DomainRouteDtoType.Webhook }, domain._id);

    const { result } = await novuClient.domains.routes.listForEnvironment({});

    expect(result.data.some((r) => r._domainId === domain._id && r.address === 'env-wide')).to.equal(true);
  });

  it('should filter listForEnvironment by destination agent id', async () => {
    const domain = await createDomain();
    const agentId = await createAgent();

    await novuClient.domains.routes.create(
      { address: 'f1', type: DomainRouteDtoType.Agent, destination: agentId },
      domain._id
    );
    await novuClient.domains.routes.create({ address: 'f2', type: DomainRouteDtoType.Webhook }, domain._id);

    const { result } = await novuClient.domains.routes.listForEnvironment({ destination: agentId });

    expect(result.data.every((r) => r.destination === agentId)).to.equal(true);
    expect(result.data.length).to.be.at.least(1);
  });

  it('should update route address', async () => {
    const domain = await createDomain();
    const { result: route } = await novuClient.domains.routes.create(
      { address: 'old-addr', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domainId: domain._id,
      routeId: route._id,
      updateDomainRouteDto: { address: 'new-addr' },
    });

    expect(updated.address).to.equal('new-addr');
  });

  it('should update agent route to webhook and clear destination', async () => {
    const domain = await createDomain();
    const agentId = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'switch', type: DomainRouteDtoType.Agent, destination: agentId },
      domain._id
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domainId: domain._id,
      routeId: route._id,
      updateDomainRouteDto: { type: DomainRouteDtoType.Webhook },
    });

    expect(updated.type).to.equal('webhook');
    expect(updated.destination).to.be.undefined;
  });

  it('should reject switching to agent without destination (400)', async () => {
    const domain = await createDomain();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'wh-only', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.update({
        domainId: domain._id,
        routeId: route._id,
        updateDomainRouteDto: { type: DomainRouteDtoType.Agent },
      })
    );

    expect(error?.statusCode).to.equal(400);
  });

  it('should update webhook route to agent with valid destination', async () => {
    const domain = await createDomain();
    const agentId = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'to-agent', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domainId: domain._id,
      routeId: route._id,
      updateDomainRouteDto: { type: DomainRouteDtoType.Agent, destination: agentId },
    });

    expect(updated.type).to.equal('agent');
    expect(updated.destination).to.equal(agentId);
  });

  it('should return 409 when update causes duplicate address and type', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'keep', type: DomainRouteDtoType.Webhook }, domain._id);
    const { result: second } = await novuClient.domains.routes.create(
      { address: 'move', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.update({
        domainId: domain._id,
        routeId: second._id,
        updateDomainRouteDto: { address: 'keep' },
      })
    );

    expect(error?.statusCode).to.equal(409);
  });

  it('should return 404 when updating a non-existent route', async () => {
    const domain = await createDomain();
    const fakeRouteId = '507f1f77bcf86cd799439014';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.update({
        domainId: domain._id,
        routeId: fakeRouteId,
        updateDomainRouteDto: { address: 'x' },
      })
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should delete a route and return 404 on subsequent retrieve', async () => {
    const domain = await createDomain();
    const { result: route } = await novuClient.domains.routes.create(
      { address: 'del-me', type: DomainRouteDtoType.Webhook },
      domain._id
    );

    await novuClient.domains.routes.delete(domain._id, route._id);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.retrieve(domain._id, route._id));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 404 when deleting a non-existent route', async () => {
    const domain = await createDomain();
    const fakeRouteId = '507f1f77bcf86cd799439015';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.delete(domain._id, fakeRouteId));

    expect(error?.statusCode).to.equal(404);
  });

  it('should reject invalid route payload (422)', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: '', type: DomainRouteDtoType.Webhook }, domain._id)
    );

    expect(error?.statusCode).to.equal(422);
  });
});
