import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';
import { AGENT_IDENTIFIER_MAX_LENGTH, ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Agents API - /agents #novu-v2', () => {
  let session: UserSession;
  const agentRepository = new AgentRepository();
  const agentIntegrationRepository = new AgentIntegrationRepository();

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create, list, get, patch, and delete an agent', async () => {
    const identifier = `e2e-agent-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'E2E Agent',
      identifier,
      description: 'e2e description',
    });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.name).to.equal('E2E Agent');
    expect(createRes.body.data.identifier).to.equal(identifier);
    expect(createRes.body.data.description).to.equal('e2e description');
    expect(createRes.body.data._id).to.be.a('string');
    // Self-hosted agents have no managed-runtime view (no provider to read
    // tools/mcpServers from). The field must be absent — see managedRuntime
    // tests in managed-agent.e2e.ts for the populated-view contract.
    expect(createRes.body.data.managedRuntime).to.equal(undefined);
    expect(createRes.body.data.createdBy).to.equal(session.user._id);
    expect(createRes.body.data.behavior?.subscriberAccess).to.equal('restricted');

    const listRes = await session.testAgent.get('/v1/agents');

    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array');
    expect(listRes.body).to.have.property('next');
    expect(listRes.body).to.have.property('previous');
    expect(listRes.body).to.have.property('totalCount');
    expect(listRes.body).to.have.property('totalCountCapped');
    expect(listRes.body.data.some((a: { identifier: string }) => a.identifier === identifier)).to.be.true;

    const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.identifier).to.equal(identifier);

    const patchRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      name: 'E2E Agent Updated',
      description: 'updated',
    });

    expect(patchRes.status).to.equal(200);
    expect(patchRes.body.data.name).to.equal('E2E Agent Updated');
    expect(patchRes.body.data.description).to.equal('updated');

    const deleteRes = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(deleteRes.status).to.equal(204);

    const afterDelete = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(afterDelete.status).to.equal(404);
  });

  it('should update and return acknowledgeOnReceived behavior', async () => {
    const identifier = `e2e-behavior-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Behavior Agent',
      identifier,
    });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.behavior?.subscriberAccess).to.equal('restricted');

    const patchRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { acknowledgeOnReceived: false },
    });

    expect(patchRes.status).to.equal(200);
    expect(patchRes.body.data.behavior.acknowledgeOnReceived).to.equal(false);
    expect(patchRes.body.data.behavior.subscriberAccess).to.equal('restricted');

    const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.behavior.acknowledgeOnReceived).to.equal(false);

    const reEnableRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { acknowledgeOnReceived: true },
    });

    expect(reEnableRes.status).to.equal(200);
    expect(reEnableRes.body.data.behavior.acknowledgeOnReceived).to.equal(true);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should update and return reactionOnResolved behavior', async () => {
    const identifier = `e2e-reactions-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Reaction Agent',
      identifier,
    });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.behavior?.subscriberAccess).to.equal('restricted');

    const setRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { reactionOnResolved: 'thumbs_up' },
    });

    expect(setRes.status).to.equal(200);
    expect(setRes.body.data.behavior.reactionOnResolved).to.equal('thumbs_up');
    expect(setRes.body.data.behavior.subscriberAccess).to.equal('restricted');

    const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.behavior.reactionOnResolved).to.equal('thumbs_up');

    const disableRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { reactionOnResolved: null },
    });

    expect(disableRes.status).to.equal(200);
    expect(disableRes.body.data.behavior.reactionOnResolved).to.equal(null);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should update and return subscriberAccess behavior', async () => {
    const identifier = `e2e-subscriber-access-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Access Agent',
      identifier,
    });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.behavior?.subscriberAccess).to.equal('restricted');

    const persisted = await agentRepository.findOne(
      {
        identifier,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      '*'
    );
    expect(persisted?.behavior?.subscriberAccess).to.equal('restricted');

    const openRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { subscriberAccess: 'open' },
    });

    expect(openRes.status).to.equal(200);
    expect(openRes.body.data.behavior.subscriberAccess).to.equal('open');

    const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.behavior.subscriberAccess).to.equal('open');

    const restrictRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { subscriberAccess: 'restricted' },
    });

    expect(restrictRes.status).to.equal(200);
    expect(restrictRes.body.data.behavior.subscriberAccess).to.equal('restricted');

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should reject an invalid subscriberAccess value', async () => {
    const identifier = `e2e-subscriber-access-invalid-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Access Agent Invalid',
      identifier,
    });

    expect(createRes.status).to.equal(201);

    const badRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      behavior: { subscriberAccess: 'everyone' },
    });

    // Class-validator failures are surfaced by AllExceptionsFilter as 422.
    expect(badRes.status).to.equal(422);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should return 422 when identifier is not a valid slug', async () => {
    const res = await session.testAgent.post('/v1/agents').send({
      name: 'Invalid Slug Agent',
      identifier: 'bad id with spaces',
    });

    expect(res.status).to.equal(422);
    const messages = res.body?.errors?.general?.messages;
    const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');

    expect(text.toLowerCase()).to.contain('identifier');
    expect(text.toLowerCase()).to.match(/slug|valid/);
  });

  it('should return 404 when agent identifier does not exist', async () => {
    const res = await session.testAgent.get('/v1/agents/nonexistent-agent-id-xyz');

    expect(res.status).to.equal(404);
  });

  it('should return 400 when both before and after cursors are provided on list agents', async () => {
    const response = await session.testAgent
      .get('/v1/agents')
      .query({ before: '000000000000000000000001', after: '000000000000000000000002' });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.contain('Cannot specify both "before" and "after" cursors');
  });

  it('should append a suffix when creating a scratch agent with a duplicate identifier', async () => {
    const identifier = `e2e-dup-${Date.now()}`;

    await session.testAgent.post('/v1/agents').send({
      name: 'First',
      identifier,
    });

    const second = await session.testAgent.post('/v1/agents').send({
      name: 'Second',
      identifier,
    });

    expect(second.status).to.equal(201);
    expect(second.body.data.identifier).to.not.equal(identifier);
    expect(second.body.data.identifier.startsWith(`${identifier}-`)).to.be.true;

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(second.body.data.identifier)}`);
  });

  it('should add, list, update, and remove agent-integration links', async () => {
    const identifier = `e2e-agent-int-${Date.now()}`;

    await session.testAgent.post('/v1/agents').send({
      name: 'Agent With Integrations',
      identifier,
    });

    const integrations = (await session.testAgent.get('/v1/integrations')).body.data as Array<{
      _id: string;
      identifier: string;
      channel: string;
      providerId: string;
    }>;

    const emailIntegration = integrations.find(
      (i) => i.channel === ChannelTypeEnum.EMAIL && i.providerId === EmailProviderIdEnum.SendGrid
    );
    const smsIntegration = integrations.find(
      (i) => i.channel === ChannelTypeEnum.SMS && i.providerId === SmsProviderIdEnum.Twilio
    );

    expect(emailIntegration, 'seeded SendGrid integration').to.exist;
    expect(smsIntegration, 'seeded Twilio integration').to.exist;

    if (!emailIntegration || !smsIntegration) {
      throw new Error('Seeded email/SMS integrations not found');
    }

    const emailIntegrationIdentifier = emailIntegration.identifier;
    const smsIntegrationIdentifier = smsIntegration.identifier;

    const addRes = await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: emailIntegrationIdentifier });

    expect(addRes.status).to.equal(201);
    expect(addRes.body.data.integration.identifier).to.equal(emailIntegrationIdentifier);
    const linkId = addRes.body.data._id as string;

    const listRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/integrations`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array');
    expect(listRes.body).to.have.property('next');
    expect(listRes.body.data.length).to.equal(1);
    expect(listRes.body.data[0]._id).to.equal(linkId);

    const patchLinkRes = await session.testAgent
      .patch(`/v1/agents/${encodeURIComponent(identifier)}/integrations/${linkId}`)
      .send({ integrationIdentifier: smsIntegrationIdentifier });

    expect(patchLinkRes.status).to.equal(200);
    expect(patchLinkRes.body.data.integration.identifier).to.equal(smsIntegrationIdentifier);

    const removeRes = await session.testAgent.delete(
      `/v1/agents/${encodeURIComponent(identifier)}/integrations/${linkId}`
    );

    expect(removeRes.status).to.equal(204);

    const listAfterRemove = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/integrations`);

    expect(listAfterRemove.body.data.length).to.equal(0);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should delete agent and cascade remove agent-integration links', async () => {
    const identifier = `e2e-cascade-${Date.now()}`;

    const createAgentRes = await session.testAgent.post('/v1/agents').send({
      name: 'Cascade Agent',
      identifier,
    });

    const agentId = createAgentRes.body.data._id as string;

    const integrations = (await session.testAgent.get('/v1/integrations')).body.data as Array<{
      identifier: string;
    }>;
    const integrationIdentifier = integrations[0].identifier;

    await session.testAgent.post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`).send({
      integrationIdentifier,
    });

    const countBefore = await agentIntegrationRepository.count({
      _agentId: agentId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(countBefore).to.equal(1);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);

    const countAfter = await agentIntegrationRepository.count({
      _agentId: agentId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(countAfter).to.equal(0);

    const agentAfter = await agentRepository.findOne(
      {
        _id: agentId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      ['_id']
    );

    expect(agentAfter).to.equal(null);
  });

  describe('Name length validation', () => {
    // Kept in sync with AGENT_NAME_MAX_LENGTH in @novu/shared. Validation failures are
    // surfaced by AllExceptionsFilter as 422 (not the class-validator default 400).
    const MAX = 60;

    it('should reject creating an agent with a name longer than the limit', async () => {
      const identifier = `e2e-name-too-long-${Date.now()}`;

      const res = await session.testAgent.post('/v1/agents').send({
        name: 'a'.repeat(MAX + 1),
        identifier,
      });

      expect(res.status).to.equal(422);
      const messages = res.body?.errors?.general?.messages;
      const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');
      expect(text.toLowerCase()).to.contain(`${MAX} characters`);

      const leftover = await agentRepository.findOne(
        {
          identifier,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['_id']
      );
      expect(leftover, 'no agent should be created when the name is too long').to.equal(null);
    });

    it('should allow creating an agent with a name exactly at the limit', async () => {
      const identifier = `e2e-name-exact-${Date.now()}`;
      const name = 'a'.repeat(MAX);

      const res = await session.testAgent.post('/v1/agents').send({ name, identifier });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.name).to.equal(name);
      expect(res.body.data.name.length).to.equal(MAX);

      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should trim trailing whitespace before measuring the name length', async () => {
      const identifier = `e2e-name-trim-${Date.now()}`;
      const trimmedName = 'a'.repeat(MAX);

      // 60 real chars + trailing whitespace => 63 raw chars, but trims back to 60.
      const res = await session.testAgent.post('/v1/agents').send({
        name: `${trimmedName}   `,
        identifier,
      });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.name).to.equal(trimmedName);
      expect(res.body.data.name.length).to.equal(MAX);

      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should reject updating an agent with a name longer than the limit', async () => {
      const identifier = `e2e-name-update-long-${Date.now()}`;
      await session.testAgent.post('/v1/agents').send({ name: 'Update Name Agent', identifier });

      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        name: 'a'.repeat(MAX + 1),
      });

      expect(res.status).to.equal(422);
      const messages = res.body?.errors?.general?.messages;
      const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');
      expect(text.toLowerCase()).to.contain(`${MAX} characters`);

      const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);
      expect(getRes.body.data.name, 'name must be unchanged after a rejected update').to.equal('Update Name Agent');

      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should allow updating an agent with a name exactly at the limit', async () => {
      const identifier = `e2e-name-update-exact-${Date.now()}`;
      await session.testAgent.post('/v1/agents').send({ name: 'Update Name Agent', identifier });

      const name = 'b'.repeat(MAX);
      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({ name });

      expect(res.status, JSON.stringify(res.body)).to.equal(200);
      expect(res.body.data.name).to.equal(name);
      expect(res.body.data.name.length).to.equal(MAX);

      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });
  });

  describe('Identifier length validation', () => {
    const MAX = AGENT_IDENTIFIER_MAX_LENGTH;

    it('should reject creating an agent with an identifier longer than the limit', async () => {
      const identifier = `e2e-id-too-long-${Date.now()}`;

      const res = await session.testAgent.post('/v1/agents').send({
        name: 'Valid Name',
        identifier: `${identifier}-${'a'.repeat(Math.max(0, MAX - identifier.length - 1))}a`,
      });

      expect(res.status).to.equal(422);
      const messages = res.body?.errors?.general?.messages;
      const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');
      expect(text.toLowerCase()).to.contain(`${MAX} characters`);
    });

    it('should allow creating an agent with an identifier exactly at the limit', async () => {
      const base = `e2e-id-exact-${Date.now()}`;
      const identifier = `${base}${'a'.repeat(Math.max(0, MAX - base.length))}`;

      const res = await session.testAgent.post('/v1/agents').send({ name: 'Valid Name', identifier });

      expect(res.status, JSON.stringify(res.body)).to.equal(201);
      expect(res.body.data.identifier).to.equal(identifier);
      expect(res.body.data.identifier.length).to.equal(MAX);

      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should reject creating an agent with an identifier far exceeding the limit', async () => {
      const res = await session.testAgent.post('/v1/agents').send({
        name: 'Valid Name',
        identifier: 'a'.repeat(5000),
      });

      expect(res.status).to.equal(422);
    });
  });

  describe('Bridge URL management', () => {
    let identifier: string;

    beforeEach(async () => {
      identifier = `e2e-bridge-${Date.now()}`;
      await session.testAgent.post('/v1/agents').send({ name: 'Bridge Agent', identifier });
    });

    afterEach(async () => {
      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should update bridgeUrl via PATCH', async () => {
      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        bridgeUrl: 'https://example.com/api/novu',
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.bridgeUrl).to.equal('https://example.com/api/novu');
    });

    it('should update devBridgeUrl and devBridgeActive via PUT bridge endpoint', async () => {
      const res = await session.testAgent.put(`/v1/agents/${encodeURIComponent(identifier)}/bridge`).send({
        devBridgeUrl: 'https://example.org',
        devBridgeActive: true,
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.devBridgeUrl).to.equal('https://example.org');
      expect(res.body.data.devBridgeActive).to.equal(true);
    });

    it('should set bridgeUrl via PUT bridge endpoint', async () => {
      const res = await session.testAgent.put(`/v1/agents/${encodeURIComponent(identifier)}/bridge`).send({
        bridgeUrl: 'https://example.com/novu',
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.bridgeUrl).to.equal('https://example.com/novu');
    });

    it('should return bridge fields on GET', async () => {
      await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        bridgeUrl: 'https://example.com/api/novu',
        devBridgeUrl: 'https://example.org',
        devBridgeActive: true,
      });

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.bridgeUrl).to.equal('https://example.com/api/novu');
      expect(res.body.data.devBridgeUrl).to.equal('https://example.org');
      expect(res.body.data.devBridgeActive).to.equal(true);
    });

    it('should deactivate devBridgeActive', async () => {
      await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        devBridgeUrl: 'https://example.org',
        devBridgeActive: true,
      });

      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        devBridgeActive: false,
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.devBridgeActive).to.equal(false);
      expect(res.body.data.devBridgeUrl).to.equal('https://example.org');
    });

    // Locks in the SSRF guard — see UpdateAgent.assertSafeBridgeUrl.
    // localhost / private IPs / link-local must be rejected so an authenticated
    // AGENT_WRITE caller can't repoint the bridge at internal hosts.
    it('should reject bridgeUrl pointing at loopback', async () => {
      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
        bridgeUrl: 'http://localhost:4000/api/novu',
      });

      expect(res.status).to.equal(400);
      expect(JSON.stringify(res.body)).to.match(/bridgeUrl/i);
    });

    it('should reject devBridgeUrl pointing at link-local cloud metadata', async () => {
      const res = await session.testAgent.put(`/v1/agents/${encodeURIComponent(identifier)}/bridge`).send({
        devBridgeUrl: 'http://169.254.169.254/latest/meta-data/',
      });

      expect(res.status).to.equal(400);
      expect(JSON.stringify(res.body)).to.match(/devBridgeUrl/i);
    });
  });

  describe('Production environment guard', () => {
    let prodSession: UserSession;
    let identifier: string;

    before(async () => {
      prodSession = new UserSession();
      await prodSession.initialize();
    });

    beforeEach(async () => {
      identifier = `e2e-prodguard-${Date.now()}`;

      await prodSession.switchToDevEnvironment();
      await prodSession.testAgent.post('/v1/agents').send({ name: 'Guard Agent', identifier });
    });

    afterEach(async () => {
      await prodSession.switchToDevEnvironment();
      await prodSession.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    });

    it('should reject devBridgeActive=true on production environment', async () => {
      await prodSession.switchToProdEnvironment();

      await prodSession.testAgent.post('/v1/agents').send({ name: 'Prod Agent', identifier: `${identifier}-prod` });

      const res = await prodSession.testAgent.patch(`/v1/agents/${encodeURIComponent(`${identifier}-prod`)}`).send({
        devBridgeActive: true,
      });

      expect(res.status).to.equal(403);

      await prodSession.testAgent.delete(`/v1/agents/${encodeURIComponent(`${identifier}-prod`)}`);
    });

    it('should reject devBridgeUrl on production environment', async () => {
      await prodSession.switchToProdEnvironment();

      await prodSession.testAgent.post('/v1/agents').send({ name: 'Prod Agent 2', identifier: `${identifier}-prod2` });

      const res = await prodSession.testAgent.patch(`/v1/agents/${encodeURIComponent(`${identifier}-prod2`)}`).send({
        devBridgeUrl: 'https://example.org',
      });

      expect(res.status).to.equal(403);

      await prodSession.testAgent.delete(`/v1/agents/${encodeURIComponent(`${identifier}-prod2`)}`);
    });

    it('should allow bridgeUrl on production environment', async () => {
      await prodSession.switchToProdEnvironment();

      await prodSession.testAgent.post('/v1/agents').send({ name: 'Prod Agent 3', identifier: `${identifier}-prod3` });

      const res = await prodSession.testAgent.patch(`/v1/agents/${encodeURIComponent(`${identifier}-prod3`)}`).send({
        bridgeUrl: 'https://example.com/novu',
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.bridgeUrl).to.equal('https://example.com/novu');

      await prodSession.testAgent.delete(`/v1/agents/${encodeURIComponent(`${identifier}-prod3`)}`);
    });
  });
});
