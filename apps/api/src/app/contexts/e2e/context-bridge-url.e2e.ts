import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

/**
 * `bridgeUrl` is a trusted, SSRF-guarded routing field. These tests hit the raw v2 REST surface
 * (not the generated SDK) so they don't depend on regenerating `@novu/api` for the new field.
 */
describe('Context bridgeUrl override - /contexts #novu-v2', () => {
  let session: UserSession;
  const contextRepository = new ContextRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(async () => {
    await contextRepository.delete({ _environmentId: session.environment._id });
  });

  it('persists and returns bridgeUrl on create', async () => {
    const bridgeUrl = 'https://example.com/api/novu';

    const res = await session.testAgent.post('/v2/contexts').send({
      type: 'tenant',
      id: 'bridge-create-acme',
      data: { region: 'us-east-1' },
      bridgeUrl,
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    expect(res.body.data.bridgeUrl).to.equal(bridgeUrl);

    const stored = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'bridge-create-acme',
    });
    expect(stored?.bridgeUrl).to.equal(bridgeUrl);
  });

  it('sets bridgeUrl on update independently of data', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'bridge-update-acme',
      key: 'tenant:bridge-update-acme',
      data: { region: 'us-east-1' },
    });

    const bridgeUrl = 'https://example.com/api/novu';
    const res = await session.testAgent.patch('/v2/contexts/tenant/bridge-update-acme').send({
      data: { region: 'us-west-2' },
      bridgeUrl,
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(200);
    expect(res.body.data.bridgeUrl).to.equal(bridgeUrl);
    expect(res.body.data.data).to.deep.equal({ region: 'us-west-2' });

    const stored = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'bridge-update-acme',
    });
    expect(stored?.bridgeUrl).to.equal(bridgeUrl);
  });

  it('preserves an existing bridgeUrl when update omits it', async () => {
    const bridgeUrl = 'https://example.com/api/novu';
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'bridge-preserve-acme',
      key: 'tenant:bridge-preserve-acme',
      data: {},
      bridgeUrl,
    });

    const res = await session.testAgent.patch('/v2/contexts/tenant/bridge-preserve-acme').send({
      data: { region: 'eu-central-1' },
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(200);
    expect(res.body.data.bridgeUrl).to.equal(bridgeUrl);
  });

  it('clears bridgeUrl when update passes null', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'bridge-clear-acme',
      key: 'tenant:bridge-clear-acme',
      data: {},
      bridgeUrl: 'https://example.com/api/novu',
    });

    const res = await session.testAgent.patch('/v2/contexts/tenant/bridge-clear-acme').send({
      data: {},
      bridgeUrl: null,
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(200);
    expect(res.body.data.bridgeUrl).to.equal(undefined);

    const stored = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'bridge-clear-acme',
    });
    expect(stored?.bridgeUrl, 'bridgeUrl unset in storage').to.equal(undefined);
  });

  it('rejects a loopback bridgeUrl on create (SSRF)', async () => {
    const res = await session.testAgent.post('/v2/contexts').send({
      type: 'tenant',
      id: 'bridge-ssrf-loopback',
      bridgeUrl: 'http://localhost:4000/api/novu',
    });

    expect(res.status).to.equal(400);
    expect(JSON.stringify(res.body)).to.contain('bridgeUrl');

    const stored = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'bridge-ssrf-loopback',
    });
    expect(stored, 'context not created when SSRF-blocked').to.not.exist;
  });

  it('rejects a metadata-service bridgeUrl on update (SSRF)', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'bridge-ssrf-metadata',
      key: 'tenant:bridge-ssrf-metadata',
      data: {},
    });

    const res = await session.testAgent.patch('/v2/contexts/tenant/bridge-ssrf-metadata').send({
      data: {},
      bridgeUrl: 'http://169.254.169.254/latest/meta-data/',
    });

    expect(res.status).to.equal(400);
    expect(JSON.stringify(res.body)).to.contain('bridgeUrl');
  });
});
