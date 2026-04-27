import { randomBytes } from 'node:crypto';
import { Novu } from '@novu/api';
import { DomainRouteDtoType } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdkInternalAuth,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Domain Routes API - /v1/domains/:domain/routes #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.MAIL_SERVER_DOMAIN = process.env.MAIL_SERVER_DOMAIN || 'mail.e2e.example.test';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  function uniqueDomainName(): string {
    return `e2e-routes-${randomBytes(6).toString('hex')}.example.test`;
  }

  async function createDomain(): Promise<{ id: string; name: string }> {
    const name = uniqueDomainName();
    const { result } = await novuClient.domains.create({ name });

    return { id: result.id, name };
  }

  async function createAgent(): Promise<{ _id: string; identifier: string }> {
    const identifier = `e2e-dr-agent-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const res = await session.testAgent.post('/v1/agents').send({
      name: 'E2E Domain Routes Agent',
      identifier,
    });
    expect(res.status).to.equal(201);

    return { _id: res.body.data._id as string, identifier };
  }

  it('should create a webhook route without agentId', async () => {
    const domain = await createDomain();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'support', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    expect(route.id).to.be.a('string');
    expect(route.domainId).to.equal(domain.id);
    expect(route.address).to.equal('support');
    expect(route.type).to.equal('webhook');
    expect(route.agentId).to.be.undefined;
  });

  it('should reject full email addresses as route addresses (422)', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.domains.routes.create(
        { address: `support@${domain.name}`, type: DomainRouteDtoType.Webhook },
        domain.name
      )
    );

    expect(error?.statusCode).to.equal(422);
  });

  it('should reject invalid inbox local parts (422)', async () => {
    const domain = await createDomain();
    const invalidAddresses = ['hello world', '.hello', 'hello.', 'hello..there'];

    for (const address of invalidAddresses) {
      const { error } = await expectSdkValidationExceptionGeneric(() =>
        novuClient.domains.routes.create({ address, type: DomainRouteDtoType.Webhook }, domain.name)
      );

      expect(error?.statusCode).to.equal(422);
    }
  });

  it('should create an agent route with a valid agent identifier', async () => {
    const domain = await createDomain();
    const agent = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      {
        address: 'agent-inbox',
        type: DomainRouteDtoType.Agent,
        agentId: agent.identifier,
      },
      domain.name
    );

    expect(route.agentId).to.equal(agent._id);
    expect(route.type).to.equal('agent');
  });

  it('should reject agent route without agentId (400)', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'no-dest', type: DomainRouteDtoType.Agent }, domain.name)
    );

    expect(error?.statusCode).to.equal(400);
    expect(String(error?.message ?? '')).to.match(/agentId/i);
  });

  it('should reject agent route with unknown agent identifier (404)', async () => {
    const domain = await createDomain();
    const unknownIdentifier = `nonexistent-${randomBytes(8).toString('hex')}`;

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create(
        {
          address: 'bad-agent',
          type: DomainRouteDtoType.Agent,
          agentId: unknownIdentifier,
        },
        domain.name
      )
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 404 when listing routes with unknown agent identifier', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.list({
        domain: domain.name,
        agentId: `nonexistent-${randomBytes(8).toString('hex')}`,
      })
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 409 when creating duplicate address and type on the same domain', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'dup', type: DomainRouteDtoType.Webhook }, domain.name);

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'dup', type: DomainRouteDtoType.Webhook }, domain.name)
    );

    expect(error?.statusCode).to.equal(409);
  });

  it('should trim route addresses before duplicate validation', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'test', type: DomainRouteDtoType.Webhook }, domain.name);

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: ' test ', type: DomainRouteDtoType.Webhook }, domain.name)
    );

    expect(error?.statusCode).to.equal(409);
  });

  it('should return 404 when creating a route on a non-existent domain', async () => {
    const fakeDomain = 'missing.example.test';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: 'x', type: DomainRouteDtoType.Webhook }, fakeDomain)
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should retrieve a domain route by id', async () => {
    const domain = await createDomain();
    const { result: created } = await novuClient.domains.routes.create(
      { address: 'get-me', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    const { result: fetched } = await novuClient.domains.routes.retrieve(domain.name, created.id);

    expect(fetched.id).to.equal(created.id);
    expect(fetched.address).to.equal('get-me');
  });

  it('should return 404 when retrieving a route with wrong domain id', async () => {
    const domainA = await createDomain();
    const domainB = await createDomain();
    const { result: route } = await novuClient.domains.routes.create(
      { address: 'iso', type: DomainRouteDtoType.Webhook },
      domainA.name
    );

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.retrieve(domainB.name, route.id));

    expect(error?.statusCode).to.equal(404);
  });

  it('should list routes for a domain', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'a1', type: DomainRouteDtoType.Webhook }, domain.name);
    await novuClient.domains.routes.create({ address: 'a2', type: DomainRouteDtoType.Webhook }, domain.name);

    const { result } = await novuClient.domains.routes.list({ domain: domain.name });

    expect(result.data.length).to.be.at.least(2);
    expect(result.data.every((r) => r.domainId === domain.id)).to.equal(true);
    expect(result).to.have.property('totalCount');
  });

  it('should paginate domain routes without overlap', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'p0', type: DomainRouteDtoType.Webhook }, domain.name);
    await novuClient.domains.routes.create({ address: 'p1', type: DomainRouteDtoType.Webhook }, domain.name);
    await novuClient.domains.routes.create({ address: 'p2', type: DomainRouteDtoType.Webhook }, domain.name);

    const limit = 1;
    const first = await novuClient.domains.routes.list({ domain: domain.name, limit });

    expect(first.result.data.length).to.equal(1);
    expect(first.result.next).to.be.a('string');

    const second = await novuClient.domains.routes.list({
      domain: domain.name,
      limit,
      after: first.result.next as string,
    });

    const overlap = first.result.data.map((r) => r.id).filter((id) => second.result.data.map((r) => r.id).includes(id));

    expect(overlap.length).to.equal(0);
  });

  it('should return 404 when listing routes for a non-existent domain', async () => {
    const fakeDomain = 'missing.example.test';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.list({ domain: fakeDomain }));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 400 when listing routes with both before and after cursors', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.list({
        domain: domain.name,
        before: '000000000000000000000001',
        after: '000000000000000000000002',
      })
    );

    expect(error?.statusCode).to.equal(400);
    expect(String(error?.message ?? '')).to.match(/both.*after/i);
  });

  it('should filter routes for a domain by agent identifier', async () => {
    const domain = await createDomain();
    const agent = await createAgent();

    await novuClient.domains.routes.create(
      { address: 'f1', type: DomainRouteDtoType.Agent, agentId: agent.identifier },
      domain.name
    );
    await novuClient.domains.routes.create({ address: 'f2', type: DomainRouteDtoType.Webhook }, domain.name);

    const { result } = await novuClient.domains.routes.list({ domain: domain.name, agentId: agent.identifier });

    expect(result.data.every((r) => r.agentId === agent._id)).to.equal(true);
    expect(result.data.length).to.equal(1);
    expect(result.data[0].address).to.equal('f1');
  });

  it('should update route address', async () => {
    const domain = await createDomain();
    const { result: route } = await novuClient.domains.routes.create(
      { address: 'old-addr', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domain: domain.name,
      routeId: route.id,
      updateDomainRouteDto: { address: 'new-addr' },
    });

    expect(updated.address).to.equal('new-addr');
  });

  it('should update agent route to webhook and clear agentId', async () => {
    const domain = await createDomain();
    const agent = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'switch', type: DomainRouteDtoType.Agent, agentId: agent.identifier },
      domain.name
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domain: domain.name,
      routeId: route.id,
      updateDomainRouteDto: { type: DomainRouteDtoType.Webhook },
    });

    expect(updated.type).to.equal('webhook');
    expect(updated.agentId).to.be.undefined;
  });

  it('should reject switching to agent without agentId (400)', async () => {
    const domain = await createDomain();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'wh-only', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.update({
        domain: domain.name,
        routeId: route.id,
        updateDomainRouteDto: { type: DomainRouteDtoType.Agent },
      })
    );

    expect(error?.statusCode).to.equal(400);
  });

  it('should update webhook route to agent with valid agent identifier', async () => {
    const domain = await createDomain();
    const agent = await createAgent();

    const { result: route } = await novuClient.domains.routes.create(
      { address: 'to-agent', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    const { result: updated } = await novuClient.domains.routes.update({
      domain: domain.name,
      routeId: route.id,
      updateDomainRouteDto: { type: DomainRouteDtoType.Agent, agentId: agent.identifier },
    });

    expect(updated.type).to.equal('agent');
    expect(updated.agentId).to.equal(agent._id);
  });

  it('should return 409 when update causes duplicate address and type', async () => {
    const domain = await createDomain();

    await novuClient.domains.routes.create({ address: 'keep', type: DomainRouteDtoType.Webhook }, domain.name);
    const { result: second } = await novuClient.domains.routes.create(
      { address: 'move', type: DomainRouteDtoType.Webhook },
      domain.name
    );

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.update({
        domain: domain.name,
        routeId: second.id,
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
        domain: domain.name,
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
      domain.name
    );

    await novuClient.domains.routes.delete(domain.name, route.id);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.retrieve(domain.name, route.id));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 404 when deleting a non-existent route', async () => {
    const domain = await createDomain();
    const fakeRouteId = '507f1f77bcf86cd799439015';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.delete(domain.name, fakeRouteId));

    expect(error?.statusCode).to.equal(404);
  });

  it('should reject invalid route payload (422)', async () => {
    const domain = await createDomain();

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.domains.routes.create({ address: '', type: DomainRouteDtoType.Webhook }, domain.name)
    );

    expect(error?.statusCode).to.equal(422);
  });
});
